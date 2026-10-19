const SUPABASE_URL = 'https://kejqfatcmxxvjuseikhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlanFmYXRjbXh4dmp1c2Vpa2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNjExNjksImV4cCI6MjEwNzkzNzE2OX0.uBfqOcLzSC_vdd2xH2U3HHryebZx5Hm6ZhHVcp7EMro';
const myDB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const PSEUDO_DOMAIN = '@paramitracker.com';

let currentUser = null; 
let currentPhotoBase64 = null;
let socialSS = { fb: null, tg: null, viber: null, tt: null, yt: null };

const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
function showSuccess(msg) { Swal.fire({ icon: 'success', title: 'အောင်မြင်ပါသည်', text: msg, confirmButtonColor: '#059669' }); }
function showError(msg) { Swal.fire({ icon: 'error', title: 'အမှားရှိနေပါသည်', text: msg, confirmButtonColor: '#ef4444' }); }
function showLoading(msg) { Swal.fire({ title: msg, allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } }); }

async function register() {
    let user = document.getElementById('auth-user').value.trim().replace(/\s+/g, '');
    let pass = document.getElementById('auth-pass').value;
    if(!user || pass.length < 6) return showError("Username နှင့် Password (အနည်းဆုံး ၆ လုံး) ထည့်ပါ။");
    showLoading("လုပ်ဆောင်နေပါသည်...");
    const { error } = await myDB.auth.signUp({ email: user+PSEUDO_DOMAIN, password: pass });
    if (error) return showError("ဒီ Username ရှိပြီးသား (သို့) အမှားရှိနေပါသည်။");
    Swal.fire({ icon: 'info', title: 'စောင့်ဆိုင်းပေးပါ', text: 'အကောင့်ဖွင့်ပြီးပါပြီ။ Admin ခွင့်ပြုချက် စောင့်ပါ။', confirmButtonColor: '#059669' });
    checkAuth();
}

async function login() {
    let user = document.getElementById('auth-user').value.trim().replace(/\s+/g, '');
    let pass = document.getElementById('auth-pass').value;
    if(!user || !pass) return showError("အချက်အလက် ပြည့်စုံစွာ ထည့်ပါ။");
    showLoading("ဝင်ရောက်နေပါသည်...");
    const { error } = await myDB.auth.signInWithPassword({ email: user+PSEUDO_DOMAIN, password: pass });
    if (error) return showError("Username သို့မဟုတ် Password မှားနေပါသည်။");
    checkAuth();
}

async function logout() {
    Swal.fire({ title: 'ထွက်မှာ သေချာပါသလား?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ထွက်မည်' }).then(async (res) => {
        if (res.isConfirmed) { await myDB.auth.signOut(); location.reload(); }
    });
}

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    let targetPage = document.getElementById('page-' + pageId);
    if(targetPage) targetPage.classList.add('active');
    
    // Find matching nav item and set active
    document.querySelectorAll('.nav-item').forEach(n => {
        if(n.getAttribute('onclick') && n.getAttribute('onclick').includes(pageId)) {
            n.classList.add('active');
        }
    });

    if(pageId === 'deposit') loadMyTimeline();
    if(pageId === 'users') loadUsersList();
    if(pageId === 'admin') loadAdminData();
}

async function checkAuth() {
    const { data: { session }, error: sessionError } = await myDB.auth.getSession();
    
    if (!session || sessionError) {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
        return;
    }

    currentUser = session.user;
    const { data: member, error: memberError } = await myDB.from('members').select('*').eq('id', currentUser.id).single();

    if (memberError || !member) {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
        return;
    }

    if(member.is_suspended) { 
        await myDB.auth.signOut(); 
        return Swal.fire({icon: 'error', title: 'အကောင့် ပိတ်ခံထားရပါသည်'}).then(()=>location.reload()); 
    }
    if(!member.is_approved) {
        return Swal.fire({icon: 'warning', title: 'ခွင့်ပြုချက် မရသေးပါ', text: 'Admin မှ အတည်ပြုရန် စောင့်ဆိုင်းနေပါသည်။', showConfirmButton: false});
    }

    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    
    document.getElementById('my-name').innerText = member.username || 'User';
    document.getElementById('my-profile-img').src = member.profile_url || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    document.getElementById('set-name').value = member.username || '';
    
    currentPhotoBase64 = member.profile_url;
    if(currentPhotoBase64) {
        let pImg = document.getElementById('preview-photo');
        if(pImg) { pImg.src = currentPhotoBase64; pImg.style.display = 'block'; }
    }

    let soc = member.social_links || {};
    ['fb', 'tg', 'viber', 'tt', 'yt'].forEach(k => {
        let elem = document.getElementById('soc-' + k);
        if(elem) elem.value = soc[k] || '';
    });

    socialSS = member.social_screenshots || { fb: null, tg: null, viber: null, tt: null, yt: null };
    ['fb', 'tg', 'viber', 'tt', 'yt'].forEach(k => {
        if(socialSS[k]) {
            let pElem = document.getElementById(`preview-ss-${k}`);
            if(pElem) { pElem.src = socialSS[k]; pElem.style.display = 'block'; }
        }
    });

    if(member.role === 'admin') {
        let adminNav = document.getElementById('nav-admin');
        if(adminNav) adminNav.style.display = 'flex';
    }
    
    // Savings check & create if not exists
    let { data: savingCheck } = await myDB.from('savings').select('*').eq('id', currentUser.id).single();
    if (!savingCheck) {
        await myDB.from('savings').insert({ id: currentUser.id, saved_amount: 0, saved_amount_thb: 0 });
    }

    loadDashboardData();
}

async function loadDashboardData() {
    const { data: savings } = await myDB.from('savings').select('*');
    if (savings) {
        let totalMMK = savings.reduce((sum, rec) => sum + Number(rec.saved_amount || 0), 0);
        let totalTHB = savings.reduce((sum, rec) => sum + Number(rec.saved_amount_thb || 0), 0);
        
        document.getElementById('app-total-mmk').innerText = totalMMK.toLocaleString();
        document.getElementById('app-total-thb').innerText = totalTHB.toLocaleString();

        let mySaving = savings.find(r => r.id === currentUser.id);
        let myMMK = mySaving ? Number(mySaving.saved_amount || 0) : 0;
        let myTHB = mySaving ? Number(mySaving.saved_amount_thb || 0) : 0;
        
        document.getElementById('my-savings-mmk').innerText = myMMK.toLocaleString();
        document.getElementById('my-savings-thb').innerText = myTHB.toLocaleString();
        
        let curMMKEl = document.getElementById('deposit-current-mmk');
        let curTHBEl = document.getElementById('deposit-current-thb');
        if(curMMKEl) curMMKEl.innerText = myMMK.toLocaleString();
        if(curTHBEl) curTHBEl.innerText = myTHB.toLocaleString();
    }
}

async function handleTransaction(type) {
    let currency = document.getElementById('trans-currency').value;
    let amt = Number(document.getElementById('trans-amount').value);
    let note = document.getElementById('trans-note').value || (type==='deposit' ? 'ငွေသွင်းခြင်း' : 'ငွေပြန်နှုတ်ခြင်း');
    
    if(!amt || amt <= 0) return showError("ပမာဏ မှန်ကန်စွာ ထည့်ပါ။");

    showLoading("လုပ်ဆောင်နေပါသည်...");

    const { data: savingData } = await myDB.from('savings').select('*').eq('id', currentUser.id).single();
    let currentMMK = Number(savingData.saved_amount || 0);
    let currentTHB = Number(savingData.saved_amount_thb || 0);

    await myDB.from('transactions').insert({ user_id: currentUser.id, amount: amt, type: type, note: note, currency: currency, delete_request_status: 'none' });

    if (currency === 'MMK') {
        if(type === 'withdraw' && amt > currentMMK) { Swal.close(); return showError("ပြန်နှုတ်မည့် MMK က လက်ရှိထက် များနေပါသည်။"); }
        let newMMK = type === 'deposit' ? currentMMK + amt : currentMMK - amt;
        await myDB.from('savings').update({ saved_amount: newMMK, updated_at: new Date() }).eq('id', currentUser.id);
    } else {
        if(type === 'withdraw' && amt > currentTHB) { Swal.close(); return showError("ပြန်နှုတ်မည့် THB က လက်ရှိထက် များနေပါသည်။"); }
        let newTHB = type === 'deposit' ? currentTHB + amt : currentTHB - amt;
        await myDB.from('savings').update({ saved_amount_thb: newTHB, updated_at: new Date() }).eq('id', currentUser.id);
    }
    
    Swal.close();
    showSuccess("အောင်မြင်စွာ မှတ်တမ်းတင်လိုက်ပါပြီ"); 
    document.getElementById('trans-amount').value = ''; 
    document.getElementById('trans-note').value = '';
    loadDashboardData(); 
    loadMyTimeline();
}

function formatTime(isoString) {
    let d = new Date(isoString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

async function loadMyTimeline() {
    const { data: trans } = await myDB.from('transactions').select('*').eq('user_id', currentUser.id).order('created_at', {ascending: false});
    renderTimeline(trans, 'my-timeline');
}

function renderTimeline(transData, elementId) {
    let el = document.getElementById(elementId);
    if(!el) return;
    let html = '';
    let isOwn = (elementId === 'my-timeline');
    
    if(transData && transData.length > 0) {
        transData.forEach(t => {
            let isDeposit = t.type === 'deposit';
            let colorClass = isDeposit ? 'text-green' : 'text-red';
            let sign = isDeposit ? '+' : '-';
            let curr = t.currency || 'MMK';
            
            let actionHtml = '';
            if (isOwn) {
                if (t.delete_request_status === 'pending') {
                    actionHtml = `<span style="font-size:11px; color:#d97706; background:#fef3c7; padding:4px 8px; border-radius:12px; margin-top:5px; display:inline-block;">ဖျက်ရန် စောင့်ဆိုင်းဆဲ</span>`;
                } else {
                    actionHtml = `<button onclick="requestDeleteTx('${t.id}')" style="background:transparent; color:#ef4444; border:1px solid #ef4444; padding:4px 10px; font-size:11px; border-radius:12px; margin-top:5px; width:auto; font-weight:bold; cursor:pointer;">အပြီးပိုင် ဖျက်ရန်</button>`;
                }
            }

            html += `
            <li>
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div class="time-date">${formatTime(t.created_at)}</div>
                        <div class="time-amount ${colorClass}">${sign} ${Number(t.amount).toLocaleString()} ${curr}</div>
                        <div style="font-size:13px; color:#6b7280; margin-top:2px;">${t.note}</div>
                    </div>
                    <div style="text-align:right;">${actionHtml}</div>
                </div>
            </li>`;
        });
    } else {
        html = "<p style='color:#9ca3af;'>မှတ်တမ်း မရှိသေးပါ။</p>";
    }
    el.innerHTML = html;
}

async function requestDeleteTx(txId) {
    const { value: reason } = await Swal.fire({
        title: 'Admin သို့ တောင်းပန်လွှာ',
        input: 'textarea',
        inputLabel: 'ဤငွေစာရင်းကို အပြီးပိုင်ဖျက်လိုသည့် အကြောင်းရင်းကို ရေးပါ',
        inputPlaceholder: 'ဥပမာ - စာရင်းမှားထည့်မိလို့ပါ...',
        showCancelButton: true,
        confirmButtonText: 'တောင်းဆိုမည်',
        cancelButtonText: 'မလုပ်ပါ',
        confirmButtonColor: '#059669',
        cancelButtonColor: '#ef4444'
    });

    if (reason) {
        showLoading("တောင်းဆိုနေပါသည်...");
        const {error} = await myDB.from('transactions').update({ delete_request_status: 'pending', delete_reason: reason }).eq('id', txId);
        Swal.close();
        if(error) showError(error.message);
        else { showSuccess("Admin ထံသို့ တောင်းဆိုချက် ပို့ပြီးပါပြီ"); loadMyTimeline(); }
    }
}

async function loadUsersList() {
    let uList = document.getElementById('users-list');
    if(!uList) return;
    uList.innerHTML = "<p>Loading...</p>";
    
    const { data: members } = await myDB.from('members').select('*').eq('is_approved', true);
    const { data: savings } = await myDB.from('savings').select('*');

    let html = '';
    if(members) {
        members.forEach(m => {
            let s = savings ? savings.find(x => x.id === m.id) : null;
            let mmk = s ? Number(s.saved_amount || 0).toLocaleString() : '0';
            let thb = s ? Number(s.saved_amount_thb || 0).toLocaleString() : '0';
            let pic = m.profile_url || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
            
            html += `
            <li class="user-row" onclick="viewUserProfile('${m.id}', '${m.username}', '${pic}', '${mmk}', '${thb}')" style="cursor:pointer;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${pic}" class="user-avatar" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3135/3135715.png'">
                    <span style="font-weight:bold;">${m.username}</span>
                </div>
                <div style="text-align:right; font-size:13px;">
                    <b style="color:#059669;">${mmk} MMK</b><br>
                    <b style="color:#0284c7;">${thb} THB</b>
                </div>
            </li>`;
        });
    }
    uList.innerHTML = html || "<p>အဖွဲ့ဝင် မရှိသေးပါ။</p>";
}

async function viewUserProfile(id, name, pic, mmk, thb) {
    switchPage('profile-view');
    document.getElementById('view-user-img').src = pic;
    document.getElementById('view-user-name').innerText = name;
    document.getElementById('view-user-total-mmk').innerText = mmk;
    document.getElementById('view-user-total-thb').innerText = thb;

    document.getElementById('view-user-timeline').innerHTML = "<p>Loading...</p>";
    const { data: trans } = await myDB.from('transactions').select('*').eq('user_id', id).order('created_at', {ascending: false});
    renderTimeline(trans, 'view-user-timeline');
}

function compressImage(file, maxWidth, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const scale = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * (img.width > maxWidth ? scale : 1);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.7));
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

let photoInput = document.getElementById('set-photo-file');
if(photoInput) {
    photoInput.addEventListener('change', function(event) {
        if(event.target.files[0]) {
            compressImage(event.target.files[0], 250, function(base64) {
                currentPhotoBase64 = base64;
                let prev = document.getElementById('preview-photo');
                if(prev) { prev.src = base64; prev.style.display = 'block'; }
            });
        }
    });
}

function setupSSUpload(key, previewId) {
    let inp = document.getElementById(`set-ss-${key}-file`);
    if(inp) {
        inp.addEventListener('change', function(event) {
            if(event.target.files[0]) {
                compressImage(event.target.files[0], 500, function(base64) {
                    socialSS[key] = base64;
                    let p = document.getElementById(previewId);
                    if(p) { p.src = base64; p.style.display = 'block'; }
                });
            }
        });
    }
}
['fb', 'tg', 'viber', 'tt', 'yt'].forEach(k => setupSSUpload(k, `preview-ss-${k}`));

async function saveSettings() {
    let newName = document.getElementById('set-name').value;
    let socialLinks = {
        fb: document.getElementById('soc-fb').value.trim(),
        tg: document.getElementById('soc-tg').value.trim(),
        viber: document.getElementById('soc-viber').value.trim(),
        tt: document.getElementById('soc-tt').value.trim(),
        yt: document.getElementById('soc-yt').value.trim()
    };

    showLoading("ပြင်ဆင်နေပါသည်...");
    const { error } = await myDB.from('members').update({ 
        username: newName, 
        profile_url: currentPhotoBase64,
        social_links: socialLinks,
        social_screenshots: socialSS
    }).eq('id', currentUser.id);

    Swal.close();
    if (error) { showError("အမှားရှိနေပါသည်။"); } 
    else { 
        showSuccess("Profile နှင့် ဆက်သွယ်ရန် လိပ်စာများ သိမ်းဆည်းပြီးပါပြီ"); 
        document.getElementById('my-name').innerText = newName;
        document.getElementById('my-profile-img').src = currentPhotoBase64 || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    }
}

async function loadAdminData() {
    const { data: members } = await myDB.from('members').select('*').order('username');
    let pendingHTML = ''; let approvedHTML = '';

    if(members) {
        members.forEach(m => {
            if (m.role !== 'admin') { 
                let pic = m.profile_url || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
                let passText = m.raw_password ? m.raw_password : 'သိမ်းဆည်းထားခြင်းမရှိ';
                let basicInfo = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${pic}" class="user-avatar" style="width:40px; height:40px;">
                        <div>
                            <span style="font-weight:bold;">${m.username}</span><br>
                            <span style="font-size: 13px; color: #059669;"><i class="fa-solid fa-key"></i> ${passText}</span>
                        </div>
                    </div>`;

                if(!m.is_approved) {
                    pendingHTML += `<li class="user-row">${basicInfo}<div><button class="btn-main" onclick="adminUserAction('${m.id}','approve')" style="padding:5px 10px; font-size:12px;">လက်ခံ</button></div></li>`;
                } else {
                    let suspendBtn = m.is_suspended 
                        ? `<button class="btn-sub" onclick="adminUserAction('${m.id}','resume')" style="padding:5px 10px; font-size:12px;">ဖွင့်</button>`
                        : `<button style="background:#f59e0b; color:white; padding:5px 10px; font-size:12px; border:none; border-radius:12px; cursor:pointer;" onclick="adminUserAction('${m.id}','suspend')">ပိတ်</button>`;
                    approvedHTML += `<li class="user-row">${basicInfo}<div style="display:flex; gap:5px;">${suspendBtn}<button class="btn-danger" onclick="adminUserAction('${m.id}','delete')" style="padding:5px 10px; font-size:12px;">ဖျက်</button></div></li>`;
                }
            }
        });
    }
    
    let pList = document.getElementById('admin-pending-list');
    let aList = document.getElementById('admin-approved-list');
    if(pList) pList.innerHTML = pendingHTML || "<p>လူသစ် မရှိပါ။</p>";
    if(aList) aList.innerHTML = approvedHTML || "<p>အဖွဲ့ဝင် မရှိပါ။</p>";

    const { data: delReqs } = await myDB.from('transactions').select('*, members(username)').eq('delete_request_status', 'pending');
    let reqHTML = '';
    if(delReqs && delReqs.length > 0) {
        delReqs.forEach(r => {
            let curr = r.currency || 'MMK';
            let sign = r.type === 'deposit' ? '+' : '-';
            reqHTML += `
            <li class="user-row" style="flex-direction:column; align-items:flex-start;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <div>
                        <b style="color:#059669;">${r.members ? r.members.username : 'Unknown'}</b> <br>
                        <span style="font-size:13px; font-weight:bold;">${r.note} (${sign}${r.amount} ${curr})</span>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-main" onclick="approveTxDelete('${r.id}', '${r.user_id}', ${r.amount}, '${r.type}', '${curr}')" style="padding:5px 10px; font-size:12px;">ခွင့်ပြု</button>
                        <button class="btn-danger" onclick="rejectTxDelete('${r.id}')" style="padding:5px 10px; font-size:12px;">ငြင်းမည်</button>
                    </div>
                </div>
                <div style="background:#fef3c7; color:#d97706; padding:10px; border-radius:8px; width:100%; font-size:13px; margin-top:10px; box-sizing:border-box;">
                    <b>တောင်းပန်လွှာ:</b> ${r.delete_reason}
                </div>
            </li>`;
        });
    }
    let dList = document.getElementById('admin-delete-requests');
    if(dList) dList.innerHTML = reqHTML || "<p>ဖျက်သိမ်းရန် တောင်းဆိုချက် မရှိပါ။</p>";
}

async function adminUserAction(id, action) {
    Swal.fire({ title: 'သေချာပါသလား?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#059669', confirmButtonText: 'သေချာပါသည်' }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading("လုပ်ဆောင်နေပါသည်...");
            if (action === 'approve') await myDB.from('members').update({is_approved: true}).eq('id', id);
            if (action === 'suspend') await myDB.from('members').update({is_suspended: true}).eq('id', id);
            if (action === 'resume') await myDB.from('members').update({is_suspended: false}).eq('id', id);
            if (action === 'delete') {
                await myDB.from('transactions').delete().eq('user_id', id);
                await myDB.from('savings').delete().eq('id', id);
                await myDB.from('members').delete().eq('id', id);
            }
            Swal.close(); Toast.fire({ icon: 'success', title: 'အောင်မြင်ပါသည်' });
            loadAdminData();
        }
    });
}

async function rejectTxDelete(txId) {
    await myDB.from('transactions').update({delete_request_status: 'none', delete_reason: null}).eq('id', txId);
    Toast.fire({ icon: 'success', title: 'ငြင်းပယ်လိုက်ပါပြီ' });
    loadAdminData();
}

async function approveTxDelete(txId, userId, amount, type, currency) {
    showLoading("အပြီးပိုင် ဖျက်သိမ်းနေပါသည်...");
    const {data: sData} = await myDB.from('savings').select('*').eq('id', userId).single();
    let col = currency === 'MMK' ? 'saved_amount' : 'saved_amount_thb';
    let currentBal = Number(sData[col] || 0);
    let newBal = type === 'deposit' ? currentBal - Number(amount) : currentBal + Number(amount);
    
    let payload = {}; payload[col] = newBal;
    await myDB.from('savings').update(payload).eq('id', userId);
    await myDB.from('transactions').delete().eq('id', txId);
    
    Swal.close(); Toast.fire({ icon: 'success', title: 'အပြီးပိုင် ဖျက်သိမ်းလိုက်ပါပြီ' });
    loadAdminData();
    loadDashboardData();
}

checkAuth();
