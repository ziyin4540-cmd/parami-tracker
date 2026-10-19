const SUPABASE_URL = 'https://kejqfatcmxxvjuseikhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlanFmYXRjbXh4dmp1c2Vpa2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNjExNjksImV4cCI6MjEwNzkzNzE2OX0.uBfqOcLzSC_vdd2xH2U3HHryebZx5Hm6ZhHVcp7EMro';
const myDB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// လက်ရှိ Login ဝင်ထားသော Member ID (Default = 1)
let currentMemberId = 1; 

// ၁။ ပင်မစာမျက်နှာ ဒေတာနှင့် စုစုပေါင်းစုငွေများကို ဆွဲထုတ်ရန်
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

// ငွေစာရင်း မှတ်တမ်းများ ပြသခြင်း
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
            <button onclick="requestDeleteTransaction(${t.id})" style="background: #fee2e2; color: #dc2626; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">ဖျက်ရန်တောင်းဆိုမည်</button>
        </div>`;
    });
    listContainer.innerHTML = html;
}

// ငွေသွင်းရန် / ငွေပြန်နှုတ်ရန် (Database သို့ သိမ်းဆည်းခြင်း)
async function addTransaction(type) {
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
    } else {
        Swal.fire('အမှားရှိသည်', 'သိမ်းဆည်း၍ မရပါ၊ ထပ်မံကြိုးစားပါ။', 'error');
    }
}

// ၂။ Users စာရင်း (Profile photo, Name, စုငွေ ပြသခြင်း)
async function loadUsersDirectory() {
    const container = document.getElementById('users-list-container');
    const { data: users, error } = await myDB.from('members').select('*');

    if (error || !users) {
        container.innerHTML = "<p style='color: red; text-align: center;'>အဖွဲ့ဝင်စာရင်း ဆွဲထုတ်၍ မရပါခင်ဗျာ။</p>";
        return;
    }

    let html = '';
    users.forEach(u => {
        let photo = u.profile_url || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
        let name = u.name || 'အမည်မရှိ အဖွဲ့ဝင်';
        html += `
        <div style="display: flex; align-items: center; gap: 15px; padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <img src="${photo}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #059669;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3135/3135715.png'">
            <div>
                <h4 style="margin: 0; color: #1f2937; font-size: 16px;">${name}</h4>
                <p style="margin: 3px 0 0 0; font-size: 13px; color: #059669; font-weight: bold;">အဖွဲ့ဝင်</p>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// ၃။ Settings စာမျက်နှာ အချက်အလက်များ Load လုပ်ခြင်း
async function loadMemberSettings() {
    const { data: member, error } = await myDB.from('members').select('*').eq('id', currentMemberId).single();
    if (error || !member) return;

    document.getElementById('settings-name').value = member.name || '';
    
    if (member.profile_url) {
        document.getElementById('current-profile-preview').innerHTML = `
            <img src="${member.profile_url}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #059669;">`;
    }

    if (member.social_links) {
        let links = typeof member.social_links === 'string' ? JSON.parse(member.social_links) : member.social_links;
        let container = document.getElementById('social-links-container');
        container.innerHTML = '';
        for (const [platform, url] of Object.entries(links)) {
            container.innerHTML += `
            <div class="social-input-row">
                <input type="text" placeholder="Platform" class="social-platform form-input" value="${platform}" style="width: 35%;">
                <input type="text" placeholder="Link" class="social-url form-input" value="${url}" style="flex: 1;">
            </div>`;
        }
    }

    window.currentSSList = [];
    if (member.social_screenshots) {
        let ssArr = typeof member.social_screenshots === 'string' ? JSON.parse(member.social_screenshots) : member.social_screenshots;
        window.currentSSList = ssArr;
        renderSSPreview();
    }
}

function renderSSPreview() {
    let ssContainer = document.getElementById('current-ss-preview');
    ssContainer.innerHTML = '';
    (window.currentSSList || []).forEach((ssUrl, idx) => {
        ssContainer.innerHTML += `
        <div style="position: relative;">
            <img src="${ssUrl}" style="width: 60px; height: 60px; border-radius: 6px; object-fit: cover; border: 1px solid #d1d5db;">
            <span onclick="removeSSPhoto(${idx})" style="position: absolute; top: -5px; right: -5px; background: #dc2626; color: white; border-radius: 50%; width: 18px; height: 18px; text-align: center; font-size: 11px; cursor: pointer; line-height: 18px;">&times;</span>
        </div>`;
    });
}

function removeSSPhoto(index) {
    window.currentSSList.splice(index, 1);
    renderSSPreview();
}

function addSocialLinkField() {
    let container = document.getElementById('social-links-container');
    container.innerHTML += `
    <div class="social-input-row">
        <input type="text" placeholder="Platform (ဥပမာ- Viber)" class="social-platform form-input" style="width: 35%;">
        <input type="text" placeholder="Link / ဖုန်းနံပါတ်" class="social-url form-input" style="flex: 1;">
    </div>`;
}

// Settings များကို Supabase သို့ သိမ်းဆည်းခြင်း
async function saveMemberSettings() {
    Swal.fire({ title: 'သိမ်းဆည်းနေပါသည်...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    let name = document.getElementById('settings-name').value;
    let photoFile = document.getElementById('settings-photo-file').files[0];
    let ssFiles = document.getElementById('settings-ss-files').files;

    let profileUrl = null;
    if (photoFile) {
        let fileName = 'profile_' + currentMemberId + '_' + Date.now() + '.jpg';
        let { error: uploadErr } = await myDB.storage.from('members_bucket').upload(fileName, photoFile);
        if (!uploadErr) {
            let { data: pubUrl } = myDB.storage.from('members_bucket').getPublicUrl(fileName);
            profileUrl = pubUrl.publicUrl;
        }
    }

    let platforms = document.querySelectorAll('.social-platform');
    let urls = document.querySelectorAll('.social-url');
    let socialLinksObj = {};
    platforms.forEach((p, idx) => {
        let pName = p.value.trim();
        let pUrl = urls[idx].value.trim();
        if (pName && pUrl) {
            socialLinksObj[pName] = pUrl;
            if (pName.toLowerCase() === 'telegram') {
                localStorage.setItem('parami_telegram', pUrl);
            }
        }
    });

    let updatedSSList = [...(window.currentSSList || [])];
    if (ssFiles && ssFiles.length > 0) {
        for (let file of ssFiles) {
            let fileName = 'ss_' + currentMemberId + '_' + Date.now() + '_' + Math.random().toString(36).substring(7) + '.jpg';
            let { error: ssErr } = await myDB.storage.from('members_bucket').upload(fileName, file);
            if (!ssErr) {
                let { data: pubUrl } = myDB.storage.from('members_bucket').getPublicUrl(fileName);
                updatedSSList.push(pubUrl.publicUrl);
            }
        }
    }

    let updateData = {
        name: name,
        social_links: socialLinksObj,
        social_screenshots: updatedSSList
    };
    if (profileUrl) updateData.profile_url = profileUrl;

    const { error } = await myDB.from('members').update(updateData).eq('id', currentMemberId);

    if (!error) {
        Swal.fire('အောင်မြင်ပါသည်', 'အချက်အလက်များကို သိမ်းဆည်းပြီးပါပြီ။', 'success');
        loadMemberSettings();
        loadHomeData();
    } else {
        Swal.fire('အမှားရှိသည်', 'သိမ်းဆည်း၍ မရပါခင်ဗျာ။', 'error');
    }
}

// ၄။ Admin Panel (အကောင့်အတည်ပြုခြင်း/ငြင်းပယ်ခြင်း/ရပ်ဆိုင်းခြင်း/ဖျက်ခြင်း နှင့် ငွေစာရင်း အပြီးတိုင်ဖျက်ခြင်း)
async function loadAdminPanel() {
    const container = document.getElementById('admin-panel-content');
    container.innerHTML = `
        <h3 style="font-size: 15px; color: #374151;">အဖွဲ့ဝင် အတည်ပြုရန် စာရင်း</h3>
        <div id="admin-members-list"><p style="font-size: 13px; color: #6b7280;">အဖွဲ့ဝင်များ ဆွဲထုတ်နေပါသည်...</p></div>
        
        <h3 style="font-size: 15px; color: #374151; margin-top: 20px;">ငွေစာရင်း အပြီးတိုင် ဖျက်ရန် (Admin)</h3>
        <div id="admin-delete-requests"><p style="font-size: 13px; color: #6b7280;">မှတ်တမ်းများ ဆွဲထုတ်နေပါသည်...</p></div>
    `;

    const { data: users } = await myDB.from('members').select('*');
    let memContainer = document.getElementById('admin-members-list');
    let memHtml = '';
    if (users && users.length > 0) {
        users.forEach(u => {
            memHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e5e7eb;">
                <span style="font-size: 13px; font-weight: bold;">${u.name || 'အမည်မရှိ'}</span>
                <div style="display: flex; gap: 5px;">
                    <button onclick="updateMemberStatus(${u.id}, 'approved')" style="background: #059669; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">လက်ခံ</button>
                    <button onclick="updateMemberStatus(${u.id}, 'suspended')" style="background: #d97706; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">ရပ်ရန်</button>
                    <button onclick="deleteMember(${u.id})" style="background: #dc2626; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">ဖျက်</button>
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
                <button onclick="adminDeleteTransaction(${t.id})" style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">အပြီးတိုင် ဖျက်မည်</button>
            </div>`;
        });
        reqContainer.innerHTML = html;
    } else {
        reqContainer.innerHTML = "<p style='font-size: 13px; color: #6b7280;'>မှတ်တမ်း မရှိပါ။</p>";
    }
}

async function updateMemberStatus(id, status) {
    const { error } = await myDB.from('members').update({ status: status }).eq('id', id);
    if (!error) {
        Swal.fire('အောင်မြင်ပါသည်', 'အဖွဲ့ဝင် အခြေအနေကို ပြောင်းလဲပြီးပါပြီ။', 'success');
        loadAdminPanel();
    }
}

async function deleteMember(id) {
    const { error } = await myDB.from('members').delete().eq('id', id);
    if (!error) {
        Swal.fire('အောင်မြင်ပါသည်', 'အဖွဲ့ဝင်ကို ဖျက်လိုက်ပါပြီ။', 'success');
        loadAdminPanel();
        loadUsersDirectory();
    }
}

async function adminDeleteTransaction(id) {
    const { error } = await myDB.from('transactions').delete().eq('id', id);
    if (!error) {
        Swal.fire('အောင်မြင်ပါသည်', 'ငွေစာရင်း မှတ်တမ်းကို အပြီးတိုင် ဖျက်လိုက်ပါပြီ။', 'success');
        loadAdminPanel();
        loadHomeData();
    } else {
        Swal.fire('အမှားရှိသည်', 'ဖျက်၍ မရပါ၊ ထပ်မံကြိုးစားပါ။', 'error');
    }
}

async function requestDeleteTransaction(id) {
    Swal.fire('တောင်းဆိုပြီးပါပြီ', 'Admin ထံသို့ ဖျက်ရန် တောင်းဆိုချက် ပို့ပြီးပါပြီ။', 'info');
}

function logout() {
    Swal.fire('ထွက်ခွာပါပြီ', 'အကောင့်မှ ထွက်လိုက်ပါပြီ။', 'success');
}

// စတင်ချိန်တွင် Load လုပ်ရန်များ
loadHomeData();
loadUsersDirectory();
loadMemberSettings();
loadAdminPanel();
