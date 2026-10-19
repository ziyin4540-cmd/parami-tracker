const SUPABASE_URL = 'https://kejqfatcmxxvjuseikhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlanFmYXRjbXh4dmp1c2Vpa2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNjExNjksImV4cCI6MjEwNzkzNzE2OX0.uBfqOcLzSC_vdd2xH2U3HHryebZx5Hm6ZhHVcp7EMro';
const myDB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentMember = null;
let isRegisterMode = false;

// 1. Auth Check on Load
function checkAuth() {
    const saved = localStorage.getItem('parami_logged_member');
    if (saved) {
        try {
            currentMember = JSON.parse(saved);
            document.getElementById('section-auth').style.display = 'none';
            document.getElementById('app-main').style.display = 'block';
            document.getElementById('app-nav').style.display = 'flex';
            
            loadHomeData();
            loadUsersDirectory();
            loadMemberSettings();
            loadAdminPanel();
            return;
        } catch (e) { console.error(e); }
    }
    document.getElementById('section-auth').style.display = 'flex';
    document.getElementById('app-main').style.display = 'none';
    document.getElementById('app-nav').style.display = 'none';
}

function toggleAuthMode(e) {
    if (e) e.preventDefault();
    isRegisterMode = !isRegisterMode;
    
    document.getElementById('auth-title').innerText = isRegisterMode ? 'အကောင့်သစ်ဖွင့်ရန်' : 'အကောင့်ဝင်ရောက်ရန်';
    document.getElementById('register-fields').style.display = isRegisterMode ? 'block' : 'none';
    document.getElementById('auth-submit-btn').innerText = isRegisterMode ? 'အကောင့်ဖွင့်မည်' : 'ဝင်ရောက်မည်';
    document.getElementById('auth-toggle-text').innerText = isRegisterMode ? 'အကောင့်ရှိပြီးသားပါက ' : 'အကောင့်မရှိသေးပါက ';
    document.getElementById('auth-toggle-btn').innerText = isRegisterMode ? 'အကောင့်ဝင်မည်' : 'အကောင့်သစ်ဖွင့်မည်';
}

async function handleAuth(e) {
    e.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const name = document.getElementById('auth-name').value.trim();

    if (!username || !password) {
        Swal.fire('သတိပေးချက်', 'Username နှင့် Password ဖြည့်သွင်းပါ။', 'warning');
        return;
    }

    Swal.fire({ title: 'လုပ်ဆောင်နေပါသည်...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    if (isRegisterMode) {
        // Register Logic
        const { data: existing } = await myDB.from('members').select('*').eq('username', username).single();
        if (existing) {
            Swal.fire('အမှားရှိသည်', 'ဤ Username ဖြင့် အကောင့်ဖွင့်ပြီးသားရှိပါသည်။', 'error');
            return;
        }

        const newMember = {
            username: username,
            name: name || username,
            password: password,
            role: 'အဖွဲ့ဝင်',
            status: 'approved'
        };

        const { data, error } = await myDB.from('members').insert([newMember]).select().single();
        if (!error && data) {
            localStorage.setItem('parami_logged_member', JSON.stringify(data));
            Swal.fire('အောင်မြင်ပါသည်', 'အကောင့်ဖွင့်လှစ်ပြီးပါပြီ။', 'success').then(() => {
                checkAuth();
            });
        } else {
            Swal.fire('အမှားရှိသည်', 'အကောင့်ဖွင့်၍ မရပါ: ' + (error ? error.message : ''), 'error');
        }
    } else {
        // Login Logic
        const { data, error } = await myDB.from('members').select('*').eq('username', username).eq('password', password).single();
        if (data && !error) {
            if (data.status === 'suspended') {
                Swal.fire('အကောင့်ရပ်ဆိုင်းထားသည်', 'သင့်အကောင့်ကို ရပ်ဆိုင်းထားပါသည်ခင်ဗျာ။', 'error');
                return;
            }
            localStorage.setItem('parami_logged_member', JSON.stringify(data));
            Swal.fire({ icon: 'success', title: 'ဝင်ရောက်မှု အောင်မြင်သည်', timer: 1000, showConfirmButton: false }).then(() => {
                checkAuth();
            });
        } else {
            Swal.fire('အမှားရှိသည်', 'Username သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်။', 'error');
        }
    }
}

// 2. Home Data
async function loadHomeData() {
    const { data: trans } = await myDB.from('transactions').select('*');
    let totalMMK = 0;
    let totalTHB = 0;

    if (trans) {
        trans.forEach(t => {
            let amt = Number(t.amount);
            if (t.currency === 'MMK') {
                totalMMK += (t.type === 'withdraw' ? -amt : amt);
            } else if (t.currency === 'THB') {
                totalTHB += (t.type === 'withdraw' ? -amt : amt);
            }
        });
    }

    document.getElementById('total-mmk').innerText = totalMMK.toLocaleString() + ' MMK';
    document.getElementById('total-thb').innerText = totalTHB.toLocaleString() + ' THB';

    let teleLink = localStorage.getItem('parami_telegram') || 'https://t.me/yourname';
    document.getElementById('telegram-link-btn').href = teleLink;

    loadTransactionsList(trans);
}

function loadTransactionsList(trans) {
    const listContainer = document.getElementById('transactions-list');
    if (!trans || trans.length === 0) {
        listContainer.innerHTML = "<p style='color: #6b7280; text-align: center;'>မှတ်တမ်း မရှိသေးပါခင်ဗျာ။</p>";
        return;
    }

    let html = '';
    trans.forEach(t => {
        let isWithdraw = t.type === 'withdraw';
        html += `
        <div style="padding: 12px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <p style="margin: 0; font-weight: bold; color: ${isWithdraw ? '#dc2626' : (t.currency === 'MMK' ? '#059669' : '#2563eb')};">
                    ${isWithdraw ? '-' : '+'} ${Number(t.amount).toLocaleString()} ${t.currency} ${t.is_donor ? '(အလှူရှင်)' : ''}
                </p>
                <p style="margin: 3px 0 0 0; font-size: 12px; color: #6b7280;">မှတ်ချက် - ${t.note || 'မရှိပါ'}</p>
            </div>
            <button onclick="requestDeleteTransaction('${t.id}')" style="background: #fee2e2; color: #dc2626; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">ဖျက်ရန်တောင်းဆိုမည်</button>
        </div>`;
    });
    listContainer.innerHTML = html;
}

// 3. Transactions
async function addTransaction(type) {
    if (!currentMember) return;
    let currency = document.getElementById('trans-currency').value;
    let amount = document.getElementById('trans-amount').value;
    let note = document.getElementById('trans-note').value;
    let isDonor = document.getElementById('is-donor-checkbox').checked;

    if (!amount || amount <= 0) {
        Swal.fire('သတိပေးချက်', 'ကျေးဇူးပြု၍ ငွေပမာဏ မှန်ကန်စွာ ထည့်သွင်းပါ။', 'warning');
        return;
    }

    let donorName = '';
    let donorAddress = '';
    let donorPhotoUrl = '';

    if (isDonor) {
        donorName = document.getElementById('donor-name').value;
        donorAddress = document.getElementById('donor-address').value;
        let photoFile = document.getElementById('donor-photo-file').files[0];

        if (photoFile) {
            let fileName = 'donor_' + Date.now() + '.jpg';
            let { error: uploadError } = await myDB.storage.from('members_bucket').upload(fileName, photoFile);
            if (!uploadError) {
                let { data: pubUrl } = myDB.storage.from('members_bucket').getPublicUrl(fileName);
                donorPhotoUrl = pubUrl.publicUrl;
            }
        }
    }

    let { error } = await myDB.from('transactions').insert([{
        member_id: currentMember.id,
        type: type,
        currency: currency,
        amount: Number(amount),
        note: note,
        is_donor: isDonor,
        donor_name: donorName,
        donor_address: donorAddress,
        donor_photo: donorPhotoUrl
    }]);

    if (!error) {
        Swal.fire('အောင်မြင်ပါသည်', 'ငွေစာရင်း မှတ်တမ်း တင်ပြီးပါပြီ။', 'success');
        document.getElementById('trans-amount').value = '';
        document.getElementById('trans-note').value = '';
        document.getElementById('is-donor-checkbox').checked = false;
        document.getElementById('donor-form-section').style.display = 'none';
        loadHomeData();
        loadUsersDirectory();
    } else {
        Swal.fire('အမှားရှိသည်', 'သိမ်းဆည်း၍ မရပါ၊ ထပ်မံကြိုးစားပါ။', 'error');
    }
}

// 4. Users Directory
async function loadUsersDirectory() {
    const container = document.getElementById('users-list-container');
    const { data: users, error } = await myDB.from('members').select('*');
    const { data: trans } = await myDB.from('transactions').select('*');

    if (error || !users) {
        container.innerHTML = "<p style='color: red; text-align: center;'>အဖွဲ့ဝင်စာရင်း ဆွဲထုတ်၍ မရပါခင်ဗျာ။</p>";
        return;
    }

    let html = '';
    users.forEach(u => {
        let photo = u.profile_url || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
        let name = u.name || u.username || 'အမည်မရှိ အဖွဲ့ဝင်';
        
        let mmkSaved = u.saved_amount || 0;
        let thbSaved = u.saved_amount_thb || 0;

        if (trans) {
            let userTrans = trans.filter(t => t.member_id === u.id);
            userTrans.forEach(t => {
                let amt = Number(t.amount);
                if (t.currency === 'MMK') mmkSaved += (t.type === 'withdraw' ? -amt : amt);
                if (t.currency === 'THB') thbSaved += (t.type === 'withdraw' ? -amt : amt);
            });
        }

        html += `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <img src="${photo}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #059669;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3135/3135715.png'">
                <div>
                    <h4 style="margin: 0; color: #1f2937; font-size: 15px;">${name}</h4>
                    <p style="margin: 2px 0 0 0; font-size: 12px; color: #6b7280;">${u.role || 'အဖွဲ့ဝင်'}</p>
                </div>
            </div>
            <div style="text-align: right;">
                <p style="margin: 0; font-size: 13px; font-weight: bold; color: #059669;">${mmkSaved.toLocaleString()} MMK</p>
                <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: bold; color: #2563eb;">${thbSaved.toLocaleString()} THB</p>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// 5. Settings
async function loadMemberSettings() {
    if (!currentMember) return;
    const { data: member, error } = await myDB.from('members').select('*').eq('id', currentMember.id).single();
    if (error || !member) return;

    document.getElementById('settings-username').value = member.username || '';
    document.getElementById('settings-name').value = member.name || '';
    
    if (member.profile_url) {
        document.getElementById('current-profile-preview').innerHTML = `
            <img src="${member.profile_url}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #059669;">`;
    }

    let container = document.getElementById('social-links-container');
    container.innerHTML = '';

    let linksArray = [];
    if (member.social_links) {
        try {
            linksArray = typeof member.social_links === 'string' ? JSON.parse(member.social_links) : member.social_links;
        } catch (e) { console.log(e); }
    }

    if (Array.isArray(linksArray) && linksArray.length > 0) {
        linksArray.forEach((item, index) => {
            addSocialLinkRow(item.platform, item.link, item.ss, index);
        });
    } else {
        addSocialLinkRow('Telegram', '', '', 0);
        addSocialLinkRow('Facebook', '', '', 1);
    }
}

function addSocialLinkRow(platform = '', link = '', ssUrl = '', index = Date.now()) {
    let container = document.getElementById('social-links-container');
    let div = document.createElement('div');
    div.className = 'social-card-item';
    div.dataset.ssUrl = ssUrl;

    div.innerHTML = `
        <div class="social-card-header">
            <input type="text" placeholder="Platform (ဥပမာ- Telegram)" class="social-platform form-input" value="${platform}" style="width: 35%;">
            <input type="text" placeholder="Link (https://...)" class="social-url form-input" value="${link}" style="flex: 1;">
        </div>
        <div class="social-card-ss">
            <label style="font-size: 12px; color: #4b5563; font-weight: bold;">${platform || 'အကောင့်'} Profile SS:</label>
            <input type="file" accept="image/*" class="social-ss-file file-input">
            ${ssUrl ? `<img src="${ssUrl}" style="width: 45px; height: 45px; border-radius: 6px; object-fit: cover; border: 1px solid #d1d5db;">` : ''}
        </div>
    `;
    container.appendChild(div);
}

async function saveMemberSettings() {
    if (!currentMember) return;
    Swal.fire({ title: 'သိမ်းဆည်းနေပါသည်...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    let name = document.getElementById('settings-name').value;
    let photoFile = document.getElementById('settings-photo-file').files[0];

    let profileUrl = null;
    if (photoFile) {
        let fileName = 'profile_' + currentMember.id + '_' + Date.now() + '.jpg';
        let { error: uploadErr } = await myDB.storage.from('members_bucket').upload(fileName, photoFile);
        if (uploadErr) {
            Swal.fire('Upload အမှား', 'Profile ပုံ တင်၍မရပါ: ' + uploadErr.message, 'error');
            return;
        }
        let { data: pubUrl } = myDB.storage.from('members_bucket').getPublicUrl(fileName);
        profileUrl = pubUrl.publicUrl;
    }

    let socialItems = document.querySelectorAll('.social-card-item');
    let socialDataList = [];

    for (let item of socialItems) {
        let pName = item.querySelector('.social-platform').value.trim();
        let pLink = item.querySelector('.social-url').value.trim();
        let ssFileInput = item.querySelector('.social-ss-file').files[0];
        let existingSsUrl = item.dataset.ssUrl || '';

        if (pName && pLink) {
            let finalSsUrl = existingSsUrl;

            if (ssFileInput) {
                let fileName = 'ss_' + currentMember.id + '_' + Date.now() + '_' + Math.random().toString(36).substring(7) + '.jpg';
                let { error: ssErr } = await myDB.storage.from('members_bucket').upload(fileName, ssFileInput);
                if (ssErr) {
                    Swal.fire('Upload အမှား', 'SS ပုံ တင်၍မရပါ: ' + ssErr.message, 'error');
                    return;
                }
                let { data: pubUrl } = myDB.storage.from('members_bucket').getPublicUrl(fileName);
                finalSsUrl = pubUrl.publicUrl;
            }

            socialDataList.push({
                platform: pName,
                link: pLink,
                ss: finalSsUrl
            });

            if (pName.toLowerCase() === 'telegram') {
                localStorage.setItem('parami_telegram', pLink);
            }
        }
    }

    let updateData = {
        name: name,
        social_links: socialDataList
    };
    if (profileUrl) updateData.profile_url = profileUrl;

    const { data: updatedMember, error } = await myDB.from('members').update(updateData).eq('id', currentMember.id).select().single();

    if (!error && updatedMember) {
        currentMember = updatedMember;
        localStorage.setItem('parami_logged_member', JSON.stringify(updatedMember));
        Swal.fire('အောင်မြင်ပါသည်', 'အချက်အလက်များကို သိမ်းဆည်းပြီးပါပြီ။', 'success');
        loadMemberSettings();
        loadHomeData();
        loadUsersDirectory();
    } else {
        Swal.fire('အမှားရှိသည်', 'Database ပြင်ဆင်၍ မရပါ: ' + (error ? error.message : ''), 'error');
    }
}

// 6. Admin Panel Functions (Fully Fixed Status Toggle & Delete)
async function loadAdminPanel() {
    const container = document.getElementById('admin-panel-content');
    container.innerHTML = `
        <h3 style="font-size: 15px; color: #374151;">အဖွဲ့ဝင် စီမံခန့်ခွဲရန် စာရင်း</h3>
        <div id="admin-members-list"><p style="font-size: 13px; color: #6b7280;">အဖွဲ့ဝင်များ ဆွဲထုတ်နေပါသည်...</p></div>
        
        <h3 style="font-size: 15px; color: #374151; margin-top: 20px;">ငွေစာရင်း မှတ်တမ်းများ (Admin)</h3>
        <div id="admin-delete-requests"><p style="font-size: 13px; color: #6b7280;">မှတ်တမ်းများ ဆွဲထုတ်နေပါသည်...</p></div>
    `;

    const { data: users } = await myDB.from('members').select('*');
    let memContainer = document.getElementById('admin-members-list');
    let memHtml = '';
    if (users && users.length > 0) {
        users.forEach(u => {
            let isSuspended = u.status === 'suspended';
            memHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e5e7eb;">
                <div>
                    <span style="font-size: 13px; font-weight: bold;">${u.name || u.username}</span>
                    <span style="font-size: 11px; color: ${isSuspended ? '#dc2626' : '#059669'}; margin-left: 5px;">(${isSuspended ? 'ရပ်ဆိုင်းထား' : 'လက်ခံထား'})</span>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="updateMemberStatus('${u.id}', '${isSuspended ? 'approved' : 'suspended'}')" style="background: ${isSuspended ? '#059669' : '#d97706'}; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">
                        ${isSuspended ? 'လက်ခံမည်' : 'ရပ်ဆိုင်းမည်'}
                    </button>
                    <button onclick="deleteMember('${u.id}')" style="background: #dc2626; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">ဖျက်မည်</button>
                </div>
            </div>`;
        });
        memContainer.innerHTML = memHtml;
    } else {
        memContainer.innerHTML = "<p style='font-size: 13px; color: #6b7280;'>အဖွဲ့ဝင် မရှိပါ။</p>";
    }

    const { data: trans } = await myDB.from('transactions').select('*');
    let reqContainer = document.getElementById('admin-delete-requests');
    let html = '';
    if (trans && trans.length > 0) {
        trans.forEach(t => {
            html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e5e7eb;">
                <span style="font-size: 13px;">ပမာဏ: ${t.amount} ${t.currency} (${t.note || 'မှတ်ချက်မရှိ'})</span>
                <button onclick="adminDeleteTransaction('${t.id}')" style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">အပြီးတိုင် ဖျက်မည်</button>
            </div>`;
        });
        reqContainer.innerHTML = html;
    } else {
        reqContainer.innerHTML = "<p style='font-size: 13px; color: #6b7280;'>မှတ်တမ်း မရှိပါ။</p>";
    }
}

async function updateMemberStatus(id, newStatus) {
    Swal.fire({ title: 'ပြင်ဆင်နေပါသည်...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const { error } = await myDB.from('members').update({ status: newStatus }).eq('id', id);
    if (!error) {
        Swal.fire('အောင်မြင်ပါသည်', 'အဖွဲ့ဝင် အခြေအနေကို ပြောင်းလဲပြီးပါပြီ။', 'success');
        loadAdminPanel();
        loadUsersDirectory();
    } else {
        Swal.fire('အမှားရှိသည်', 'ပြင်ဆင်၍ မရပါ: ' + error.message, 'error');
    }
}

async function deleteMember(id) {
    Swal.fire({
        title: 'ဖျက်ရန် သေချာပါသလား။',
        text: 'ဤအဖွဲ့ဝင်၏ အချက်အလက်များ ပျက်သွားပါမည်။',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'ဖျက်မည်',
        cancelButtonText: 'မဖျက်ပါ'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'ဖျက်နေပါသည်...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const { error } = await myDB.from('members').delete().eq('id', id);
            if (!error) {
                Swal.fire('အောင်မြင်ပါသည်', 'အဖွဲ့ဝင်ကို ဖျက်လိုက်ပါပြီ။', 'success');
                loadAdminPanel();
                loadUsersDirectory();
            } else {
                Swal.fire('အမှားရှိသည်', 'ဖျက်၍ မရပါ: ' + error.message, 'error');
            }
        }
    });
}

async function adminDeleteTransaction(id) {
    const { error } = await myDB.from('transactions').delete().eq('id', id);
    if (!error) {
        Swal.fire('အောင်မြင်ပါသည်', 'ငွေစာရင်း မှတ်တမ်းကို ဖျက်လိုက်ပါပြီ။', 'success');
        loadAdminPanel();
        loadHomeData();
    } else {
        Swal.fire('အမှားရှိသည်', 'ဖျက်၍ မရပါခင်ဗျာ။', 'error');
    }
}

function requestDeleteTransaction(id) {
    Swal.fire('တောင်းဆိုပြီးပါပြီ', 'Admin ထံသို့ ဖျက်ရန် တောင်းဆိုချက် ပို့ပြီးပါပြီ။', 'info');
}

// 7. Logout
function logout() {
    Swal.fire({
        title: 'ထွက်ခွာမည်မှာ သေချာပါသလား။',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'ထွက်မည်',
        cancelButtonText: 'မထွက်ပါ'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('parami_logged_member');
            currentMember = null;
            checkAuth();
            Swal.fire({ title: 'ထွက်ခွာပါပြီ', icon: 'success', timer: 1200, showConfirmButton: false });
        }
    });
}

// Initialize Auth
checkAuth();
