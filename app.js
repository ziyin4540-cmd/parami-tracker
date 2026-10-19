// သင့် Supabase Project URL နှင့် API Key
const SUPABASE_URL = 'https://kejqfatcmxxvjuseikhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlanFmYXRjbXh4dmp1c2Vpa2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNjExNjksImV4cCI6MjEwNzkzNzE2OX0.uBfqOcLzSC_vdd2xH2U3HHryebZx5Hm6ZhHVcp7EMro';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const PSEUDO_DOMAIN = '@paramitracker.com'; // Username သီးသန့်သုံးရန် လှည့်ကွက်

async function register() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    
    if(!user || pass.length < 6) return alert("Username ထည့်ပါ။ Password အနည်းဆုံး ၆ လုံး ရှိရပါမည်။");

    document.getElementById('auth-msg').innerText = "လုပ်ဆောင်နေပါသည်...";

    const { data, error } = await supabase.auth.signUp({
        email: user + PSEUDO_DOMAIN,
        password: pass
    });

    if (error) {
        document.getElementById('auth-msg').innerText = "အမှားရှိနေပါသည် သို့မဟုတ် Username ရှိပြီးသားပါ။";
    } else {
        alert("အကောင့်ဖွင့်ပြီးပါပြီ။ Admin ခွင့်ပြုချက်ကို စောင့်ပါ။");
        document.getElementById('auth-msg').innerText = "";
        checkUser();
    }
}

async function login() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    
    if(!user || !pass) return alert("Username နှင့် Password ရိုက်ထည့်ပါ။");
    document.getElementById('auth-msg').innerText = "ဝင်ရောက်နေပါသည်...";

    const { data, error } = await supabase.auth.signInWithPassword({
        email: user + PSEUDO_DOMAIN,
        password: pass
    });

    if (error) {
        document.getElementById('auth-msg').innerText = "Username သို့မဟုတ် Password မှားနေပါသည်။";
    } else {
        document.getElementById('auth-msg').innerText = "";
        checkUser();
    }
}

async function logout() {
    await supabase.auth.signOut();
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// အကောင့်ဝင်ထားသလား စစ်ဆေးခြင်း
async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        
        // Admin Approve လုပ်ထားသလား စစ်ဆေးခြင်း
        const { data: memberData } = await supabase
            .from('members')
            .select('is_approved')
            .eq('id', user.id)
            .single();

        if (memberData && memberData.is_approved) {
            document.getElementById('approved-content').classList.remove('hidden');
            document.getElementById('pending-msg').classList.add('hidden');
            loadSavings(user.id);
        } else {
            document.getElementById('pending-msg').classList.remove('hidden');
            document.getElementById('approved-content').classList.add('hidden');
        }
    }
}

// ငွေစာရင်းများ ဆွဲယူခြင်း
async function loadSavings(userId) {
    const { data: allSavings } = await supabase.from('savings').select('id, saved_amount');
    
    if (allSavings) {
        // စုစုပေါင်း တွက်ချက်ခြင်း
        let total = allSavings.reduce((sum, record) => sum + Number(record.saved_amount), 0);
        document.getElementById('total-amount').innerText = total.toLocaleString(); 

        // မိမိစုငွေကို ရှာပြခြင်း
        let myData = allSavings.find(r => r.id === userId);
        if(myData) {
            document.getElementById('my-saving').innerText = Number(myData.saved_amount).toLocaleString();
        }
    }
}

// မိမိစုငွေကို ပြင်ဆင်ခြင်း
async function updateSaving() {
    const newAmount = document.getElementById('new-amount').value;
    if(!newAmount || isNaN(newAmount)) return alert("ငွေပမာဏကို ဂဏန်းဖြင့်သာ ရိုက်ထည့်ပါ။");

    const { data: { user } } = await supabase.auth.getUser();
    const btn = document.querySelector('.btn-update');
    btn.innerText = "သိမ်းဆည်းနေသည်...";
    
    const { error } = await supabase
        .from('savings')
        .update({ saved_amount: Number(newAmount), updated_at: new Date() })
        .eq('id', user.id);

    btn.innerText = "သိမ်းဆည်းမည် (Update)";

    if (error) {
        alert("ပြင်ဆင်ခွင့်မရှိပါ သို့မဟုတ် အမှားရှိနေပါသည်။");
    } else {
        alert("အောင်မြင်စွာ သိမ်းဆည်းလိုက်ပါပြီ။");
        document.getElementById('new-amount').value = '';
        loadSavings(user.id); 
    }
}

// Website စတက်တက်ချင်း စစ်ဆေးရန်
checkUser();
