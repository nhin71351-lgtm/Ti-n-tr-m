/* ---------------- clock ---------------- */
function tickClock(){
  const now = new Date();
  const t = now.toLocaleTimeString('vi-VN', { hour12:false });
  const d = now.toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' });
  document.getElementById('clockTime').textContent = t;
  document.getElementById('clockDate').textContent = d.charAt(0).toUpperCase() + d.slice(1);
}
tickClock();
setInterval(tickClock, 1000);

/* ---------------- EmailJS config (gửi OTP thật về Gmail) ---------------- */
const EMAILJS_PUBLIC_KEY  = 'oZ6spPlC2NgS_ZRFq';
const EMAILJS_SERVICE_ID  = 'Tientram27';
const EMAILJS_TEMPLATE_ID = 'template_z2aesfc';
emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

/* ---------------- login / signup screen ---------------- */
const loginOverlay = document.getElementById('loginOverlay');
const appShell = document.getElementById('appShell');
const loginPanel = document.getElementById('loginPanel');
const signupPanel = document.getElementById('signupPanel');
const otpPanel = document.getElementById('otpPanel');
const authContainer = document.getElementById('authContainer');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const otpForm = document.getElementById('otpForm');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');
const otpError = document.getElementById('otpError');
const otpInput = document.getElementById('otpInput');
const otpSubtext = document.getElementById('otpSubtext');
const otpSubmitBtn = document.getElementById('otpSubmitBtn');
const loginPassInput = document.getElementById('loginPass');
const rememberSwitch = document.getElementById('rememberSwitch');

// trạng thái phiên đăng ký đang chờ xác thực OTP
let pendingSignup = null; // { user, pass, email, code, expiresAt }

function generateOtp(){
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sendOtpEmail(email, code){
  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email: email,
    otp_code: code
  });
}

function showOtpPanel(email){
  authContainer.classList.add('active', 'otp');
  otpError.classList.remove('show');
  otpInput.value = '';
  otpSubtext.textContent = 'Nhập mã OTP vừa gửi tới ' + email;
  setTimeout(() => otpInput.focus(), 400);
}

document.getElementById('resendOtp').addEventListener('click', (e) => {
  e.preventDefault();
  if(!pendingSignup) return;
  const newCode = generateOtp();
  pendingSignup.code = newCode;
  pendingSignup.expiresAt = Date.now() + 5 * 60 * 1000;
  otpSubmitBtn.disabled = true;
  otpError.classList.remove('show');
  sendOtpEmail(pendingSignup.email, newCode)
    .then(() => {
      otpSubmitBtn.disabled = false;
      otpError.textContent = 'Đã gửi lại mã mới.';
      otpError.classList.add('show');
      otpError.style.color = 'var(--safe, #4fb28a)';
    })
    .catch((err) => {
      otpSubmitBtn.disabled = false;
      otpError.style.color = '';
      otpError.textContent = 'Không gửi được email. Vui lòng thử lại.';
      otpError.classList.add('show');
      console.error('EmailJS error:', err);
    });
});

otpForm.addEventListener('submit', (e) => {
  e.preventDefault();
  otpError.style.color = '';
  if(!pendingSignup){
    otpError.textContent = 'Phiên đăng ký đã hết hạn, vui lòng đăng ký lại.';
    otpError.classList.add('show');
    return;
  }
  if(Date.now() > pendingSignup.expiresAt){
    otpError.textContent = 'Mã OTP đã hết hạn, vui lòng bấm "Gửi lại".';
    otpError.classList.add('show');
    return;
  }
  const entered = otpInput.value.trim();
  if(entered !== pendingSignup.code){
    otpError.textContent = 'Mã OTP không đúng, vui lòng thử lại.';
    otpError.classList.add('show');
    return;
  }
  // OTP đúng — tạo tài khoản chính thức
  const finishedUser = pendingSignup.user;
  const finishedPass = pendingSignup.pass;
  pendingSignup = null;
  hashPass(finishedUser, finishedPass).then(hash => {
    accounts.push({ user: finishedUser, hash });
    saveAccounts();               // nhớ tài khoản — lần sau chỉ cần đăng nhập
    showLogin(finishedUser);
  });
});

/* ---------------- lưu tài khoản & phiên đăng nhập (localStorage) ----------------
   Không có backend thật: tài khoản được lưu ngay trong trình duyệt này để
   người dùng chỉ cần đăng ký 1 lần. Mật khẩu được băm SHA-256, không lưu dạng chữ thường. */
const ACCOUNTS_KEY = 'tientram_accounts';
const SESSION_KEY  = 'tientram_session';

function storeGet(store, key){
  try{ return store.getItem(key); }catch(e){ return null; }
}
function storeSet(store, key, val){
  try{ store.setItem(key, val); }catch(e){ /* trình duyệt chặn lưu trữ — bỏ qua */ }
}
function storeDel(store, key){
  try{ store.removeItem(key); }catch(e){}
}

async function hashPass(user, pass){
  const text = 'tientram|' + user.toLowerCase() + '|' + pass;
  if(window.crypto && crypto.subtle){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return 'plain:' + text; // dự phòng khi trình duyệt không hỗ trợ crypto.subtle
}

let accounts = [];
try{ accounts = JSON.parse(storeGet(localStorage, ACCOUNTS_KEY) || '[]'); }catch(e){ accounts = []; }
function saveAccounts(){ storeSet(localStorage, ACCOUNTS_KEY, JSON.stringify(accounts)); }

// tài khoản demo có sẵn
const accountsReady = (async () => {
  if(!accounts.find(a => a.user === 'tientram_admin')){
    accounts.push({ user:'tientram_admin', hash: await hashPass('tientram_admin', 'tientram2026') });
    saveAccounts();
  }
})();

document.querySelectorAll('.toggle-eye').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

rememberSwitch.addEventListener('click', () => {
  rememberSwitch.classList.toggle('on');
});

document.getElementById('forgotLink').addEventListener('click', (e) => e.preventDefault());

function showSignup(){
  loginError.classList.remove('show');
  authContainer.classList.remove('otp');
  authContainer.classList.add('active');   // trượt sang form Đăng ký
}
function showLogin(prefillUser){
  signupError.classList.remove('show');
  authContainer.classList.remove('active', 'otp');   // trượt về form Đăng nhập
  if(prefillUser){
    document.getElementById('loginUser').value = prefillUser;
    document.getElementById('loginPass').value = '';
    setTimeout(() => document.getElementById('loginPass').focus(), 400);
  }
}
document.getElementById('goSignup').addEventListener('click', (e) => { e.preventDefault(); showSignup(); });
document.getElementById('goLogin').addEventListener('click', (e) => { e.preventDefault(); showLogin(); });

function enterApp(){
  loginOverlay.classList.add('hidden');
  appShell.classList.add('shown');
  setTimeout(() => { drawShipmentDots(); }, 50);
}

function logout(){
  storeDel(localStorage, SESSION_KEY);
  storeDel(sessionStorage, SESSION_KEY);
  appShell.classList.remove('shown');
  loginOverlay.classList.remove('hidden');
  loginPassInput.value = '';
  showLogin();
}
document.getElementById('logoutBtn').addEventListener('click', (e) => { e.preventDefault(); logout(); });

// tự động vào lại nếu đã đăng nhập trước đó (và đã bật "Ghi nhớ đăng nhập")
(async () => {
  await accountsReady;
  const saved = storeGet(sessionStorage, SESSION_KEY) || storeGet(localStorage, SESSION_KEY);
  if(saved && accounts.find(a => a.user === saved)){
    enterApp();
  }
})();

// ĐĂNG NHẬP — chỉ vào trang chủ khi khớp đúng tài khoản đã đăng ký (hoặc tài khoản demo)
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = loginPassInput.value;
  if(!user || !pass){
    loginError.textContent = 'Vui lòng nhập tên đăng nhập và mật khẩu.';
    loginError.classList.add('show');
    return;
  }
  await accountsReady;
  const hash = await hashPass(user, pass);
  const match = accounts.find(a => a.user === user && a.hash === hash);
  if(!match){
    loginError.textContent = 'Sai tên đăng nhập hoặc mật khẩu.';
    loginError.classList.add('show');
    return;
  }
  loginError.classList.remove('show');
  // "Ghi nhớ đăng nhập" bật -> nhớ cả khi đóng trình duyệt; tắt -> chỉ nhớ trong phiên hiện tại
  storeDel(localStorage, SESSION_KEY);
  storeDel(sessionStorage, SESSION_KEY);
  storeSet(rememberSwitch.classList.contains('on') ? localStorage : sessionStorage, SESSION_KEY, user);
  enterApp();
});

// ĐĂNG KÝ — tạo tài khoản mới rồi quay lại màn đăng nhập, không vào thẳng trang chủ
signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = document.getElementById('signupUser').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pass = document.getElementById('signupPass').value;
  const pass2 = document.getElementById('signupPass2').value;

  if(!user || !email || !pass || !pass2){
    signupError.textContent = 'Vui lòng điền đầy đủ thông tin.';
    signupError.classList.add('show');
    return;
  }
  if(accounts.find(a => a.user === user)){
    signupError.textContent = 'Tên đăng nhập đã tồn tại, vui lòng chọn tên khác.';
    signupError.classList.add('show');
    return;
  }
  if(pass.length < 6){
    signupError.textContent = 'Mật khẩu cần ít nhất 6 ký tự.';
    signupError.classList.add('show');
    return;
  }
  if(pass !== pass2){
    signupError.textContent = 'Mật khẩu nhập lại không khớp.';
    signupError.classList.add('show');
    return;
  }

  signupError.classList.remove('show');

  const code = generateOtp();
  pendingSignup = { user, pass, email, code, expiresAt: Date.now() + 5 * 60 * 1000 };

  const submitBtn = signupForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'ĐANG GỬI MÃ...';

  sendOtpEmail(email, code)
    .then(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'ĐĂNG KÝ';
      signupForm.reset();
      showOtpPanel(email);
    })
    .catch((err) => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'ĐĂNG KÝ';
      pendingSignup = null;
      signupError.textContent = 'Không gửi được email OTP. Vui lòng kiểm tra lại email hoặc thử lại sau.';
      signupError.classList.add('show');
      console.error('EmailJS error:', err);
    });
});

/* ---------------- editable KPI numbers ---------------- */
document.querySelectorAll('.kpi-strip .num[contenteditable]').forEach(el => {
  el.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){ e.preventDefault(); el.blur(); }
  });
  el.addEventListener('focus', () => {
    // select all text for quick overwrite
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  el.addEventListener('blur', () => {
    const type = el.dataset.type;
    const digits = el.textContent.replace(/[^\d]/g, '');
    if(digits === ''){
      el.textContent = type === 'percent' ? '0%' : '0';
      return;
    }
    let num = parseInt(digits, 10);
    if(type === 'percent'){
      num = Math.min(100, num);
      el.textContent = num + '%';
    } else {
      el.textContent = String(num);
    }
  });
});

/* ---------------- nav / view switching ---------------- */
function switchView(target){
  document.querySelectorAll('.topnav a').forEach(a => a.classList.remove('active'));
  const navLink = document.querySelector('.topnav a[data-view="' + target + '"]');
  if(navLink) navLink.classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + target).classList.add('active');
  window.scrollTo({top:0, behavior:'smooth'});
  if(target === 'xray' && window.xrayApi) window.xrayApi.onShow();
}
document.querySelectorAll('.topnav a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(link.dataset.view);
  });
});
document.querySelectorAll('.dash-preview-card').forEach(card => {
  card.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(card.dataset.jump);
  });
});

/* ---------------- data ---------------- */
const routePaths = {
  hn:'route-hn', hp:'route-hp', dn:'route-dn', ct:'route-ct', qn:'route-qn'
};

/* declared early because drawShipmentDots() (called on initial load) reads these */
const routeLabels = { hn:'Bình Dương → Hà Nội', hp:'Bình Dương → Hải Phòng', dn:'Bình Dương → Đà Nẵng', ct:'Bình Dương → Cần Thơ', qn:'Bình Dương → Quy Nhơn' };
let userShipments = [];
let userShipmentCounter = 4900;

let alerts = [
  {
    id:'LH-4821', route:'hn', progress:64, level:'danger', score:82,
    photoType:'rain',
    title:'Dự báo mưa lớn trên QL1A đoạn Hà Tĩnh — nguy cơ trễ 4–6 giờ',
    meta:'Tuyến Bình Dương → Hà Nội · Tài xế Nguyễn Văn Hải · Xe 51D-224.xx',
    etaOriginal:'09:00 · 12/09', etaPredicted:'14:30 · 12/09',
    action:'Gợi ý: chuyển sang trạm trung chuyển Vinh, báo khách hàng dời giờ nhận',
    steps:[
      {t:'06:10', l:'Xuất kho', done:true},
      {t:'09:40', l:'Qua Phan Thiết', done:true},
      {t:'—', l:'Qua Hà Tĩnh', flag:true},
      {t:'—', l:'Đến kho Hà Nội', done:false}
    ],
    iot:{
      temp:{val:26.8, unit:'°C', threshold:35, breach:false, sub:'Ngưỡng an toàn ≤ 35°C'},
      humidity:{val:88, unit:'%', threshold:85, breach:true, sub:'Ngưỡng an toàn ≤ 85% — ảnh hưởng mưa lớn'},
      shock:{val:0.5, unit:'g', threshold:2.5, breach:false, sub:'Không phát hiện va đập'},
      door:{val:'Đóng', breach:false, sub:'Lần mở gần nhất: xuất kho 06:10'}
    }
  },
  {
    id:'LH-4835', route:'ct', progress:38, level:'warn', score:56,
    photoType:'stop',
    title:'Xe dừng bất thường 42 phút gần Vĩnh Long, không theo lịch trình',
    meta:'Tuyến Bình Dương → Cần Thơ · Tài xế Lê Thanh Tùng · Xe 61C-118.xx',
    etaOriginal:'15:00 · 12/09', etaPredicted:'16:10 · 12/09',
    action:'Gợi ý: gọi xác nhận với tài xế trong 15 phút tới',
    steps:[
      {t:'07:30', l:'Xuất kho', done:true},
      {t:'—', l:'Dừng bất thường', flag:true},
      {t:'—', l:'Qua Vĩnh Long', done:false},
      {t:'—', l:'Đến kho Cần Thơ', done:false}
    ],
    iot:{
      temp:{val:30.2, unit:'°C', threshold:35, breach:false, sub:'Ngưỡng an toàn ≤ 35°C'},
      humidity:{val:73, unit:'%', threshold:85, breach:false, sub:'Ngưỡng an toàn ≤ 85%'},
      shock:{val:0.3, unit:'g', threshold:2.5, breach:false, sub:'Không phát hiện va đập'},
      door:{val:'Đóng', breach:false, sub:'Chưa mở kể từ khi xuất kho'}
    }
  },
  {
    id:'LH-4809', route:'dn', progress:71, level:'danger', score:78,
    photoType:'temp',
    title:'Nhiệt độ thùng lạnh vượt ngưỡng 6°C trong 20 phút',
    meta:'Tuyến Bình Dương → Đà Nẵng · Hàng đông lạnh · Xe 51D-390.xx',
    etaOriginal:'11:00 · 12/09', etaPredicted:'11:00 · 12/09 (rủi ro chất lượng)',
    action:'Gợi ý: kiểm tra hệ thống lạnh tại trạm dừng gần nhất, chuẩn bị phương án đổi hàng',
    steps:[
      {t:'05:50', l:'Xuất kho', done:true},
      {t:'09:15', l:'Qua Quy Nhơn', done:true},
      {t:'—', l:'Vượt ngưỡng nhiệt độ', flag:true},
      {t:'—', l:'Đến kho Đà Nẵng', done:false}
    ],
    iot:{
      temp:{val:8.4, unit:'°C', threshold:6, breach:true, sub:'Ngưỡng an toàn ≤ 6°C'},
      humidity:{val:76, unit:'%', threshold:85, breach:false, sub:'Ngưỡng an toàn ≤ 85%'},
      shock:{val:0.2, unit:'g', threshold:2.5, breach:false, sub:'Không phát hiện va đập'},
      door:{val:'Đóng', breach:false, sub:'Lần mở gần nhất: xuất kho 05:50'}
    }
  },
  {
    id:'LH-4847', route:'hp', progress:22, level:'warn', score:48,
    photoType:'traffic',
    title:'Mật độ giao thông cao bất thường trên tuyến cao tốc Pháp Vân',
    meta:'Tuyến Bình Dương → Hải Phòng · Tài xế Trần Quốc Bảo · Xe 29H-552.xx',
    etaOriginal:'18:30 · 12/09', etaPredicted:'19:45 · 12/09',
    action:'Gợi ý: đề xuất lộ trình thay thế qua QL5',
    steps:[
      {t:'08:00', l:'Xuất kho', done:true},
      {t:'—', l:'Vào khu vực ùn tắc', flag:true},
      {t:'—', l:'Qua Ninh Bình', done:false},
      {t:'—', l:'Đến kho Hải Phòng', done:false}
    ],
    iot:{
      temp:{val:24.6, unit:'°C', threshold:35, breach:false, sub:'Ngưỡng an toàn ≤ 35°C'},
      humidity:{val:79, unit:'%', threshold:85, breach:false, sub:'Ngưỡng an toàn ≤ 85%'},
      shock:{val:0.4, unit:'g', threshold:2.5, breach:false, sub:'Không phát hiện va đập'},
      door:{val:'Đóng', breach:false, sub:'Chưa mở kể từ khi xuất kho'}
    }
  },
  {
    id:'LH-4852', route:'qn', progress:47, level:'danger', score:71,
    photoType:'xray',
    title:'Cảm biến sốc ghi nhận va đập mạnh 3.1g khi qua đèo Cù Mông — đã quét nội thất, nghi vỡ',
    meta:'Tuyến Bình Dương → Quy Nhơn · Hàng dễ vỡ (gốm sứ) · Xe 61C-207.xx',
    etaOriginal:'16:00 · 12/09', etaPredicted:'16:00 · 12/09 (rủi ro hư hỏng hàng)',
    action:'Gợi ý: yêu cầu tài xế dừng kiểm tra tình trạng hàng thực tế, đối chiếu với kết quả quét trước khi tiếp tục',
    steps:[
      {t:'07:00', l:'Xuất kho', done:true},
      {t:'—', l:'Va đập mạnh phát hiện', flag:true},
      {t:'—', l:'Qua Tuy Hòa', done:false},
      {t:'—', l:'Đến kho Quy Nhơn', done:false}
    ],
    iot:{
      temp:{val:29.1, unit:'°C', threshold:35, breach:false, sub:'Ngưỡng an toàn ≤ 35°C'},
      humidity:{val:64, unit:'%', threshold:85, breach:false, sub:'Ngưỡng an toàn ≤ 85%'},
      shock:{val:3.1, unit:'g', threshold:2.5, breach:true, sub:'Ngưỡng cảnh báo ≥ 2.5g'},
      door:{val:'Đóng', breach:false, sub:'Lần mở gần nhất: xuất kho 07:00'}
    }
  },
  {
    id:'LH-4860', route:'ct', progress:55, level:'warn', score:61,
    photoType:'door',
    title:'Cửa thùng xe mở ngoài lịch trình gần Long An',
    meta:'Tuyến Bình Dương → Cần Thơ · Hàng thực phẩm khô · Xe 51D-478.xx',
    etaOriginal:'14:00 · 12/09', etaPredicted:'14:20 · 12/09',
    action:'Gợi ý: gọi xác nhận tài xế, đối chiếu camera trạm dừng gần nhất',
    steps:[
      {t:'08:20', l:'Xuất kho', done:true},
      {t:'—', l:'Mở cửa ngoài lịch trình', flag:true},
      {t:'—', l:'Qua Long An', done:false},
      {t:'—', l:'Đến kho Cần Thơ', done:false}
    ],
    iot:{
      temp:{val:31.4, unit:'°C', threshold:35, breach:false, sub:'Ngưỡng an toàn ≤ 35°C'},
      humidity:{val:70, unit:'%', threshold:85, breach:false, sub:'Ngưỡng an toàn ≤ 85%'},
      shock:{val:0.4, unit:'g', threshold:2.5, breach:false, sub:'Không phát hiện va đập'},
      door:{val:'Mở lúc 10:05', breach:true, sub:'Không nằm trong lịch trình giao nhận'}
    }
  }
];

const simPool = [
  {
    route:'qn', level:'warn', score:52,
    title:'Cảng đến báo chậm tiếp nhận do tàu cập bến trễ 3 giờ',
    action:'Gợi ý: thông báo trước cho khách hàng về mốc giao mới',
    metaSuffix:'Tuyến Bình Dương → Quy Nhơn',
    photoType:'port',
    iot:{
      temp:{val:28.3, unit:'°C', threshold:35, breach:false, sub:'Ngưỡng an toàn ≤ 35°C'},
      humidity:{val:66, unit:'%', threshold:85, breach:false, sub:'Ngưỡng an toàn ≤ 85%'},
      shock:{val:0.3, unit:'g', threshold:2.5, breach:false, sub:'Không phát hiện va đập'},
      door:{val:'Đóng', breach:false, sub:'Chưa mở kể từ khi xuất kho'}
    }
  },
  {
    route:'hn', level:'danger', score:74,
    title:'Tài xế báo sự cố lốp xe, đang dừng chờ cứu hộ',
    action:'Gợi ý: điều xe dự phòng gần nhất tiếp ứng',
    metaSuffix:'Tuyến Bình Dương → Hà Nội',
    photoType:'tire',
    iot:{
      temp:{val:29.7, unit:'°C', threshold:35, breach:false, sub:'Ngưỡng an toàn ≤ 35°C'},
      humidity:{val:72, unit:'%', threshold:85, breach:false, sub:'Ngưỡng an toàn ≤ 85%'},
      shock:{val:1.1, unit:'g', threshold:2.5, breach:false, sub:'Rung nhẹ khi xe dừng khẩn cấp'},
      door:{val:'Đóng', breach:false, sub:'Chưa mở kể từ khi xuất kho'}
    }
  },
  {
    route:'dn', level:'warn', score:44,
    title:'Thời tiết sương mù dày trên đèo Hải Vân, tốc độ giảm 40%',
    action:'Gợi ý: cập nhật ETA mới cho khách hàng, theo dõi thêm 30 phút',
    metaSuffix:'Tuyến Bình Dương → Đà Nẵng',
    photoType:'fog',
    iot:{
      temp:{val:22.4, unit:'°C', threshold:35, breach:false, sub:'Ngưỡng an toàn ≤ 35°C'},
      humidity:{val:91, unit:'%', threshold:85, breach:true, sub:'Ngưỡng an toàn ≤ 85% — ảnh hưởng sương mù'},
      shock:{val:0.2, unit:'g', threshold:2.5, breach:false, sub:'Không phát hiện va đập'},
      door:{val:'Đóng', breach:false, sub:'Chưa mở kể từ khi xuất kho'}
    }
  },
  {
    route:'ct', level:'danger', score:69,
    title:'Cảm biến nhiệt độ ghi nhận tăng đột ngột 9°C trong thùng lạnh',
    action:'Gợi ý: kiểm tra máy lạnh xe, chuẩn bị phương án đổi hàng nếu vượt ngưỡng quá 30 phút',
    metaSuffix:'Tuyến Bình Dương → Cần Thơ · Hàng đông lạnh',
    photoType:'temp',
    iot:{
      temp:{val:9.2, unit:'°C', threshold:6, breach:true, sub:'Ngưỡng an toàn ≤ 6°C'},
      humidity:{val:80, unit:'%', threshold:85, breach:false, sub:'Ngưỡng an toàn ≤ 85%'},
      shock:{val:0.3, unit:'g', threshold:2.5, breach:false, sub:'Không phát hiện va đập'},
      door:{val:'Đóng', breach:false, sub:'Chưa mở kể từ khi xuất kho'}
    }
  },
  {
    route:'hn', level:'warn', score:57,
    title:'Cảm biến sốc ghi nhận rung lắc mạnh liên tục trên đoạn đường xấu',
    action:'Gợi ý: khuyến nghị tài xế giảm tốc, kiểm tra lại hàng tại điểm dừng kế tiếp',
    metaSuffix:'Tuyến Bình Dương → Hà Nội · Hàng dễ vỡ · đã quét nội thất, nguyên vẹn',
    photoType:'xray_ok',
    iot:{
      temp:{val:27.5, unit:'°C', threshold:35, breach:false, sub:'Ngưỡng an toàn ≤ 35°C'},
      humidity:{val:68, unit:'%', threshold:85, breach:false, sub:'Ngưỡng an toàn ≤ 85%'},
      shock:{val:2.8, unit:'g', threshold:2.5, breach:true, sub:'Ngưỡng cảnh báo ≥ 2.5g'},
      door:{val:'Đóng', breach:false, sub:'Chưa mở kể từ khi xuất kho'}
    }
  }
];

/* ---------------- render feed ---------------- */
const feedList = document.getElementById('feedList');

function scoreColor(level){ return level === 'danger' ? 'var(--danger)' : 'var(--warn)'; }

function scanGrid(w,h,step,op){
  let s='';
  for(let x=step;x<w;x+=step) s+=`<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="#3a4658" stroke-width="0.5" opacity="${op}"/>`;
  for(let y=step;y<h;y+=step) s+=`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#3a4658" stroke-width="0.5" opacity="${op}"/>`;
  return s;
}
function scanNoise(w,h,count){
  let s='';
  for(let i=0;i<count;i++){
    s+=`<circle cx="${(Math.random()*w).toFixed(1)}" cy="${(Math.random()*h).toFixed(1)}" r="${(0.4+Math.random()*0.4).toFixed(1)}" fill="#3a7ea8" opacity="${(0.08+Math.random()*0.12).toFixed(2)}"/>`;
  }
  return s;
}
function pointCloudEllipse(cx,cy,rx,ry,color,count,jitter){
  jitter = jitter || 1.3;
  let s='';
  for(let i=0;i<count;i++){
    const a=(i/count)*Math.PI*2 + Math.random()*0.2;
    const jr=1+(Math.random()-0.5)*0.14;
    const x=(cx+Math.cos(a)*rx*jr+(Math.random()-0.5)*jitter).toFixed(1);
    const y=(cy+Math.sin(a)*ry*jr+(Math.random()-0.5)*jitter).toFixed(1);
    s+=`<circle cx="${x}" cy="${y}" r="${(0.6+Math.random()*0.6).toFixed(1)}" fill="${color}" opacity="${(0.55+Math.random()*0.45).toFixed(2)}"/>`;
  }
  return s;
}
function pointCloudRect(x,y,w,h,color,count){
  let s=''; const perim=2*(w+h);
  for(let i=0;i<count;i++){
    let d=Math.random()*perim, px,py;
    if(d<w){ px=x+d; py=y; } else if(d<w+h){ px=x+w; py=y+(d-w); }
    else if(d<2*w+h){ px=x+w-(d-w-h); py=y+h; } else { px=x; py=y+h-(d-2*w-h); }
    px+=(Math.random()-0.5)*1.2; py+=(Math.random()-0.5)*1.2;
    s+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(0.6+Math.random()*0.5).toFixed(1)}" fill="${color}" opacity="${(0.55+Math.random()*0.4).toFixed(2)}"/>`;
  }
  return s;
}
function scatterShards(cx,cy,spread,count,color){
  let s='';
  for(let i=0;i<count;i++){
    s+=`<circle cx="${(cx+(Math.random()-0.5)*spread*2).toFixed(1)}" cy="${(cy+(Math.random()-0.5)*spread).toFixed(1)}" r="${(0.7+Math.random()*0.7).toFixed(1)}" fill="${color}" opacity="${(0.5+Math.random()*0.45).toFixed(2)}"/>`;
  }
  return s;
}

function renderPhotoFrame(type, timeLabel, camId){
  const W=320, H=180;
  const scenes = {
    rain: `
      <rect width="${W}" height="${H}" fill="#1b222c"/>
      <rect x="0" y="118" width="${W}" height="62" fill="#141a22"/>
      <path d="M0 120 L120 108 L220 116 L320 106 L320 120 Z" fill="#232b36"/>
      ${Array.from({length:22}).map(()=>{const x=Math.random()*W, y=Math.random()*100, len=8+Math.random()*10;
        return `<line x1="${x}" y1="${y}" x2="${x-4}" y2="${y+len}" stroke="#5b7a94" stroke-width="1.4" opacity="0.7"/>`;}).join('')}
      <rect x="118" y="90" width="42" height="26" rx="3" fill="#e8a33d"/>
      <text x="325" y="14" font-size="9" fill="#586071" font-family="monospace"></text>
    `,
    stop: `
      <rect width="${W}" height="${H}" fill="#171c24"/>
      <rect x="0" y="130" width="${W}" height="50" fill="#11151c"/>
      <rect x="90" y="70" width="140" height="55" rx="4" fill="#2a3140"/>
      <rect x="90" y="70" width="140" height="55" rx="4" fill="none" stroke="#e8a33d" stroke-width="2" stroke-dasharray="6,4"/>
      <circle cx="106" cy="128" r="9" fill="#0c0f14"/>
      <circle cx="212" cy="128" r="9" fill="#0c0f14"/>
      <text x="160" y="102" font-size="11" fill="#e8a33d" font-family="monospace" text-anchor="middle">DỪNG 42:00</text>
    `,
    temp: `
      <rect width="${W}" height="${H}" fill="#171c24"/>
      <rect x="120" y="30" width="80" height="110" rx="14" fill="#1d2430" stroke="#e2574c" stroke-width="2"/>
      <rect x="150" y="50" width="20" height="70" rx="10" fill="#2a3140"/>
      <rect x="150" y="85" width="20" height="35" rx="10" fill="#e2574c"/>
      <circle cx="160" cy="128" r="14" fill="#e2574c"/>
      <text x="160" y="160" font-size="13" fill="#e2574c" font-family="monospace" text-anchor="middle">8.4°C</text>
    `,
    traffic: `
      <rect width="${W}" height="${H}" fill="#1b222c"/>
      <rect x="0" y="120" width="${W}" height="60" fill="#232b36"/>
      <rect x="10" y="96" width="46" height="24" rx="3" fill="#e8a33d"/>
      <rect x="70" y="100" width="40" height="20" rx="3" fill="#e2574c"/>
      <rect x="140" y="94" width="50" height="26" rx="3" fill="#e8a33d"/>
      <rect x="210" y="98" width="42" height="22" rx="3" fill="#e2574c"/>
      <rect x="270" y="96" width="40" height="24" rx="3" fill="#e8a33d"/>
      <text x="160" y="60" font-size="11" fill="#e8a33d" font-family="monospace" text-anchor="middle">MẬT ĐỘ CAO</text>
    `,
    shock: `
      <rect width="${W}" height="${H}" fill="#171c24"/>
      <rect x="118" y="55" width="84" height="70" rx="4" fill="#2a3140" stroke="#e2574c" stroke-width="2"/>
      <path d="M118 90 L140 90 L148 75 L158 105 L168 85 L176 90 L202 90" fill="none" stroke="#e2574c" stroke-width="2.4"/>
      <path d="M96 40 L106 55 M224 40 L214 55 M96 140 L106 125 M224 140 L214 125" stroke="#e8a33d" stroke-width="2"/>
      <text x="160" y="150" font-size="12" fill="#e2574c" font-family="monospace" text-anchor="middle">VA ĐẬP 3.1g</text>
    `,
    door: `
      <rect width="${W}" height="${H}" fill="#171c24"/>
      <rect x="70" y="30" width="180" height="120" rx="3" fill="#2a3140"/>
      <rect x="80" y="40" width="75" height="100" rx="2" fill="#171c24" stroke="#e2574c" stroke-width="2"/>
      <rect x="160" y="40" width="80" height="100" rx="2" fill="#1d2430"/>
      <circle cx="150" cy="90" r="4" fill="#e2574c"/>
      <text x="160" y="165" font-size="12" fill="#e2574c" font-family="monospace" text-anchor="middle">CỬA MỞ NGOÀI LỊCH</text>
    `,
    port: `
      <rect width="${W}" height="${H}" fill="#152029"/>
      <rect x="0" y="130" width="${W}" height="50" fill="#0d1620"/>
      <rect x="40" y="60" width="14" height="80" fill="#586071"/>
      <path d="M47 60 L47 30 L140 45 L140 55" fill="none" stroke="#586071" stroke-width="4"/>
      <rect x="130" y="45" width="26" height="16" fill="#e8a33d"/>
      <rect x="190" y="95" width="80" height="35" fill="#2a3140"/>
      <rect x="190" y="95" width="80" height="35" fill="none" stroke="#e8a33d" stroke-width="1.5"/>
      <text x="160" y="20" font-size="11" fill="#8d96a6" font-family="monospace" text-anchor="middle">CẢNG ĐẾN</text>
    `,
    tire: `
      <rect width="${W}" height="${H}" fill="#171c24"/>
      <rect x="0" y="132" width="${W}" height="48" fill="#232b36"/>
      <circle cx="160" cy="120" r="34" fill="#0c0f14" stroke="#586071" stroke-width="4"/>
      <circle cx="160" cy="120" r="12" fill="#2a3140"/>
      <path d="M126 120 L194 120" stroke="#e2574c" stroke-width="3"/>
      <text x="160" y="165" font-size="12" fill="#e2574c" font-family="monospace" text-anchor="middle">SỰ CỐ LỐP XE</text>
    `,
    fog: `
      <rect width="${W}" height="${H}" fill="#232a36"/>
      <rect x="0" y="130" width="${W}" height="50" fill="#1d2430"/>
      <rect x="130" y="95" width="60" height="40" rx="4" fill="#586071" opacity="0.5"/>
      <rect x="0" y="70" width="${W}" height="18" fill="#8d96a6" opacity="0.35"/>
      <rect x="0" y="100" width="${W}" height="14" fill="#8d96a6" opacity="0.45"/>
      <rect x="0" y="128" width="${W}" height="12" fill="#8d96a6" opacity="0.55"/>
      <text x="160" y="30" font-size="11" fill="#8d96a6" font-family="monospace" text-anchor="middle">SƯƠNG MÙ DÀY</text>
    `,
    xray: `
      <rect width="${W}" height="${H}" fill="#05070a"/>
      ${scanGrid(W,H,20,0.08)}
      ${scanNoise(W,H,55)}
      <rect x="70" y="40" width="180" height="110" rx="4" fill="none" stroke="#3a4658" stroke-width="1" stroke-dasharray="2,4" opacity="0.5"/>
      <rect x="95" y="25" width="150" height="95" rx="4" fill="none" stroke="#3a4658" stroke-width="1" stroke-dasharray="2,4" opacity="0.3"/>
      ${pointCloudEllipse(118,120,28,10,'#5dcaa5',48,1.3)}
      ${pointCloudEllipse(118,107,28,10,'#5dcaa5',48,1.3)}
      ${pointCloudEllipse(118,94,28,10,'#e2574c',40,3.4)}
      ${scatterShards(118,90,22,16,'#e2574c')}
      ${pointCloudEllipse(195,100,15,5,'#5dcaa5',20,1.1)}
      ${pointCloudRect(180,100,30,24,'#5dcaa5',26)}
      <defs><linearGradient id="sweepXray" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#e8a33d" stop-opacity="0"/>
        <stop offset="50%" stop-color="#e8a33d" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#e8a33d" stop-opacity="0"/>
      </linearGradient></defs>
      <rect class="scan-sweep-bar" x="0" y="0" width="16" height="${H}" fill="url(#sweepXray)"/>
      <text x="10" y="14" font-size="8.5" fill="#5b7a94" font-family="monospace">MMWAVE 24GHZ · ĐANG QUÉT</text>
      <text x="160" y="166" font-size="12" fill="#e2574c" font-family="monospace" text-anchor="middle">NỨT Ở ĐĨA TRÊN CÙNG</text>
    `,
    xray_ok: `
      <rect width="${W}" height="${H}" fill="#05070a"/>
      ${scanGrid(W,H,20,0.08)}
      ${scanNoise(W,H,55)}
      <rect x="70" y="40" width="180" height="110" rx="4" fill="none" stroke="#3a4658" stroke-width="1" stroke-dasharray="2,4" opacity="0.5"/>
      <rect x="95" y="25" width="150" height="95" rx="4" fill="none" stroke="#3a4658" stroke-width="1" stroke-dasharray="2,4" opacity="0.3"/>
      ${pointCloudEllipse(118,120,28,10,'#5dcaa5',48,1.3)}
      ${pointCloudEllipse(118,107,28,10,'#5dcaa5',48,1.3)}
      ${pointCloudEllipse(118,94,28,10,'#5dcaa5',48,1.3)}
      ${pointCloudEllipse(195,100,15,5,'#5dcaa5',20,1.1)}
      ${pointCloudRect(180,100,30,24,'#5dcaa5',26)}
      <defs><linearGradient id="sweepOk" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#4fb28a" stop-opacity="0"/>
        <stop offset="50%" stop-color="#4fb28a" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#4fb28a" stop-opacity="0"/>
      </linearGradient></defs>
      <rect class="scan-sweep-bar" x="0" y="0" width="16" height="${H}" fill="url(#sweepOk)"/>
      <text x="10" y="14" font-size="8.5" fill="#5b7a94" font-family="monospace">MMWAVE 24GHZ · HOÀN TẤT</text>
      <text x="160" y="166" font-size="12" fill="#4fb28a" font-family="monospace" text-anchor="middle">TẤT CẢ NGUYÊN VẸN</text>
    `
  };
  const scene = scenes[type] || scenes.stop;
  const isXray = type === 'xray' || type === 'xray_ok';
  const headLabel = isXray ? 'Trạm quét không gian nội thất · mô phỏng' : 'IoT/CCTV mô phỏng';
  const footNote = isXray ? 'Hình ảnh dựng từ sóng mmWave — không phải ảnh X-quang thật' : 'Ảnh minh họa dựng từ dữ liệu cảm biến — không phải ảnh thật';
  const scanSummary = type === 'xray'
    ? 'Phát hiện: 3 đĩa xếp chồng, 1 cốc — đĩa trên cùng nghi nứt'
    : (type === 'xray_ok' ? 'Phát hiện: 3 đĩa xếp chồng, 1 cốc — không có vị trí nứt vỡ' : '');
  return `
    <div class="photo-frame">
      <div class="photo-frame-head">
        <span>${camId || 'CAM-01'} · ${headLabel}</span>
        <span class="cam-live">${isXray ? 'SCAN' : 'REC'}</span>
      </div>
      <div class="photo-canvas">
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${scene}</svg>
      </div>
      ${isXray ? `<div style="padding:8px 11px 2px; font-size:11.5px; color:${type === 'xray' ? '#e2574c' : '#4fb28a'}; border-top:1px solid var(--line-soft);">${scanSummary}</div>` : ''}
      <div class="photo-frame-foot">
        <span>${footNote}</span>
        <span>${timeLabel || '—'}</span>
      </div>
    </div>`;
}

function renderAlert(a){
  const row = document.createElement('div');
  row.className = 'alert-row';
  row.dataset.id = a.id;
  row.dataset.route = a.route;

  const stepsHtml = a.steps.map(s => {
    const cls = s.flag ? 'flag' : (s.done ? '' : 'pending');
    return `<div class="tl-step ${cls}">
      <div class="tl-dot"></div>
      <div class="tl-time mono">${s.t}</div>
      <div class="tl-label">${s.l}</div>
    </div>`;
  }).join('');

  const iotHtml = a.iot ? (() => {
    const s = a.iot;
    const anyBreach = Object.values(s).some(x => x.breach);
    const cell = (label, x) => `
      <div class="sensor-item ${x.breach ? 'breach':''}">
        <div class="sensor-label">${label}</div>
        <div class="sensor-val ${x.breach ? 'breach':''}">${x.val}${x.unit || ''}</div>
        <div class="sensor-sub">${x.sub}</div>
      </div>`;
    return `
      <div class="iot-panel">
        <div class="iot-panel-head">
          <span class="iot-dot ${anyBreach ? 'alert':''}"></span>
          Dữ liệu cảm biến IoT trên thùng hàng · cập nhật mỗi 2 phút
        </div>
        <div class="sensor-grid">
          ${cell('Nhiệt độ', s.temp)}
          ${cell('Độ ẩm', s.humidity)}
          ${cell('Va đập', s.shock)}
          ${cell('Cửa thùng', s.door)}
        </div>
      </div>`;
  })() : '';

  row.innerHTML = `
    <div class="sev-bar ${a.level}"></div>
    <div style="flex:1">
      <div class="alert-main">
        <div class="alert-top">
          <span class="alert-id">${a.id}</span>
          <span class="alert-score ${a.level}">Rủi ro ${a.score}/100</span>
        </div>
        <div class="alert-title">${a.title}</div>
        <div class="alert-meta">${a.meta} ${a.iot ? '<span class="tier-badge iot">IoT</span>' : ''}</div>
      </div>
      <div class="alert-detail" id="detail-${a.id}">
        <div class="alert-detail-inner">
          <div class="risk-gauge">
            <div class="rg-top"><span>Điểm rủi ro dự đoán</span><span class="mono">${a.score}/100</span></div>
            <div class="rg-track"><div class="rg-fill" style="width:${a.score}%; background:${scoreColor(a.level)}"></div></div>
          </div>
          <div class="timeline">${stepsHtml}</div>
          ${a.photoType ? renderPhotoFrame(a.photoType, a.steps.find(s=>s.flag)?.t !== '—' ? a.steps.find(s=>s.flag)?.t : 'vừa xong', a.id) : ''}
          <div class="eta-compare">
            <div class="eta-box">
              <div class="eta-label">ETA ban đầu</div>
              <div class="eta-val mono">${a.etaOriginal}</div>
            </div>
            <div class="eta-box">
              <div class="eta-label">ETA dự đoán mới</div>
              <div class="eta-val mono danger">${a.etaPredicted}</div>
            </div>
          </div>
          ${iotHtml}
          <div style="font-size:13px; color:var(--text-dim); margin-top:10px;">${a.action}</div>
          <div class="action-row">
            <button class="btn btn-primary" data-act="apply">Áp dụng gợi ý</button>
            <button class="btn btn-ghost" data-act="notify">Báo khách hàng</button>
            <button class="btn btn-resolve" data-act="resolve">Đánh dấu đã xử lý</button>
          </div>
        </div>
      </div>
      <div class="resolved-note">✓ Đã xử lý — lô hàng ${a.id} được theo dõi lại bình thường</div>
    </div>
  `;

  row.querySelector('.alert-main').addEventListener('click', () => {
    const d = row.querySelector('.alert-detail');
    const isOpen = d.classList.contains('open');
    document.querySelectorAll('.alert-detail.open').forEach(el => el.classList.remove('open'));
    if(!isOpen){ d.classList.add('open'); highlightRoute(a.route); }
  });

  row.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = btn.dataset.act;
      if(act === 'resolve'){
        row.classList.add('resolved');
        updateKpi(-1);
      } else {
        btn.textContent = act === 'apply' ? 'Đã áp dụng ✓' : 'Đã gửi ✓';
        btn.disabled = true;
        btn.style.opacity = .6;
      }
    });
  });

  return row;
}

alerts.forEach(a => feedList.appendChild(renderAlert(a)));

function updateDashAlertPreview(){
  const hint = document.getElementById('dashAlertPreviewHint');
  if(!hint) return;
  if(alerts.length === 0){
    hint.textContent = 'Không có cảnh báo nào đang mở.';
    return;
  }
  const top = alerts[0];
  const levelLabel = top.level === 'danger' ? 'Nguy cơ cao' : 'Cần theo dõi';
  hint.textContent = `${alerts.length} cảnh báo đang mở · mới nhất: [${levelLabel}] ${top.title}`;
}
updateDashAlertPreview();

function updateKpi(delta){
  const el = document.getElementById('kpiRisk');
  const cur = parseInt(el.textContent, 10);
  el.textContent = Math.max(0, cur + delta);
}

function updateTotalKpi(delta){
  const el = document.getElementById('kpiTotal');
  const cur = parseInt(el.textContent, 10);
  el.textContent = Math.max(0, cur + delta);
}

function updateIotKpi(delta){
  const el = document.getElementById('kpiIot');
  const cur = parseInt(el.textContent, 10);
  el.textContent = Math.max(0, cur + delta);
}

/* ---------------- map shipment dots ---------------- */
const shipmentLayer = document.getElementById('shipmentLayer');
const NS = 'http://www.w3.org/2000/svg';

function colorFor(level){
  return level === 'danger' ? '#e2574c' : (level === 'warn' ? '#e8a33d' : '#4fb28a');
}

function placeDotOnPath(pathId, progressPct){
  const path = document.getElementById(pathId);
  const len = path.getTotalLength();
  const pt = path.getPointAtLength(len * (progressPct/100));
  return pt;
}

function drawShipmentDots(){
  shipmentLayer.innerHTML = '';
  // risk dots from alerts, fixed at their detection point
  alerts.forEach(a => {
    if(document.querySelector(`.alert-row[data-id="${a.id}"]`)?.classList.contains('resolved')) return;
    const pathId = routePaths[a.route];
    const pt = placeDotOnPath(pathId, a.progress);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'shipment-dot');
    g.dataset.id = a.id;
    g.innerHTML = `
      <circle class="warn-ring" cx="${pt.x}" cy="${pt.y}" r="9" fill="none" stroke="${colorFor(a.level)}" stroke-width="1.6"/>
      <circle class="core" cx="${pt.x}" cy="${pt.y}" r="5" fill="${colorFor(a.level)}"/>
    `;
    g.addEventListener('click', () => {
      const row = document.querySelector(`.alert-row[data-id="${a.id}"]`);
      if(row){
        row.scrollIntoView({behavior:'smooth', block:'center'});
        row.querySelector('.alert-main').click();
      }
    });
    shipmentLayer.appendChild(g);
  });

  // calm on-track dots gently drifting along each route
  const calmRoutes = [
    {path:'route-hn', start:20}, {path:'route-hp', start:70}, {path:'route-ct', start:55},
    {path:'route-qn', start:35}, {path:'route-dn', start:15}
  ];
  calmRoutes.forEach((r, i) => {
    const pt = placeDotOnPath(r.path, r.start);
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.setAttribute('r', 4);
    c.setAttribute('fill', '#4fb28a'); c.setAttribute('opacity', '0.85');
    shipmentLayer.appendChild(c);
  });

  // user-added shipments, placed on their route if one was picked
  userShipments.forEach(s => {
    if(!s.routeKey || !routePaths[s.routeKey]) return;
    const pathId = routePaths[s.routeKey];
    const progress = 10 + Math.floor(Math.random()*20);
    const pt = placeDotOnPath(pathId, progress);
    const ringColor = s.iot ? '#e8a33d' : '#4fb28a';
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'shipment-dot');
    g.innerHTML = `
      <circle cx="${pt.x}" cy="${pt.y}" r="9" fill="none" stroke="${ringColor}" stroke-width="1.4" stroke-dasharray="2,2"/>
      <circle class="core" cx="${pt.x}" cy="${pt.y}" r="4.5" fill="${ringColor}"/>
    `;
    g.addEventListener('click', () => {
      const row = document.querySelector(`.strow[data-id="${s.id}"]`);
      if(row){ row.scrollIntoView({behavior:'smooth', block:'center'}); }
    });
    shipmentLayer.appendChild(g);
  });
}
drawShipmentDots();

function highlightRoute(routeKey){
  Object.values(routePaths).forEach(id => {
    document.getElementById(id).style.stroke = 'var(--line)';
    document.getElementById(id).style.strokeWidth = '1.4';
  });
  const id = routePaths[routeKey];
  const el = document.getElementById(id);
  el.style.stroke = '#e8a33d';
  el.style.strokeWidth = '2.2';
}

/* ---------------- simulate new alert ---------------- */
let simCounter = 4848;
document.getElementById('simBtn').addEventListener('click', () => {
  const pick = simPool[Math.floor(Math.random() * simPool.length)];
  simCounter++;
  const newAlert = {
    id: 'LH-' + simCounter,
    route: pick.route,
    progress: 30 + Math.floor(Math.random()*40),
    level: pick.level,
    score: pick.score,
    title: pick.title,
    meta: pick.metaSuffix + ' · phát hiện lúc ' + new Date().toLocaleTimeString('vi-VN',{hour12:false}),
    etaOriginal: '—',
    etaPredicted: '—',
    action: pick.action,
    iot: pick.iot,
    photoType: pick.photoType,
    steps:[
      {t:'—', l:'Xuất kho', done:true},
      {t:'—', l:'Phát hiện rủi ro', flag:true},
      {t:'—', l:'Đang theo dõi', done:false},
      {t:'—', l:'Đến kho đích', done:false}
    ]
  };
  alerts.unshift(newAlert);
  const row = renderAlert(newAlert);
  row.classList.add('entering');
  feedList.insertBefore(row, feedList.firstChild);
  updateKpi(1);
  drawShipmentDots();
  updateDashAlertPreview();
  row.scrollIntoView({behavior:'smooth', block:'center'});
});

/* ---------------- add trip (manual shipment entry) ---------------- */
const tripModalOverlay = document.getElementById('tripModalOverlay');
const tripForm = document.getElementById('tripForm');
const tripFormError = document.getElementById('tripFormError');
const tripRouteSelect = document.getElementById('tripRoute');
const tripRouteOtherRow = document.getElementById('tripRouteOtherRow');
const shipmentsTable = document.getElementById('shipmentsTable');
const shipmentsEmpty = document.getElementById('shipmentsEmpty');
const totalKpiEl = document.querySelector('.kpi-strip .kpi:first-child .num');

function openTripModal(){
  tripModalOverlay.classList.add('open');
  tripFormError.classList.remove('show');
  document.getElementById('tripId').focus();
}
function closeTripModal(){
  tripModalOverlay.classList.remove('open');
  tripForm.reset();
  tripRouteOtherRow.style.display = 'none';
}

document.getElementById('addTripBtn').addEventListener('click', openTripModal);
const addTripBtn2 = document.getElementById('addTripBtn2');
if(addTripBtn2) addTripBtn2.addEventListener('click', openTripModal);
document.getElementById('tripModalClose').addEventListener('click', closeTripModal);
document.getElementById('tripCancelBtn').addEventListener('click', closeTripModal);
tripModalOverlay.addEventListener('click', (e) => { if(e.target === tripModalOverlay) closeTripModal(); });

tripRouteSelect.addEventListener('change', () => {
  tripRouteOtherRow.style.display = tripRouteSelect.value === 'other' ? 'block' : 'none';
});

function generateIotReadings(cargo){
  const isCold = /lạnh|đông|mát|dược/i.test(cargo || '');
  const tempThreshold = isCold ? 6 : 35;
  const tempVal = isCold ? +(3 + Math.random()*2.5).toFixed(1) : +(22 + Math.random()*10).toFixed(1);
  const humidityVal = Math.round(55 + Math.random()*25);
  const shockVal = +(Math.random()*1.2).toFixed(1);
  return {
    temp:{val:tempVal, unit:'°C', threshold:tempThreshold, breach:tempVal > tempThreshold, sub:`Ngưỡng an toàn ≤ ${tempThreshold}°C`},
    humidity:{val:humidityVal, unit:'%', threshold:85, breach:humidityVal > 85, sub:'Ngưỡng an toàn ≤ 85%'},
    shock:{val:shockVal, unit:'g', threshold:2.5, breach:shockVal > 2.5, sub:'Ngưỡng cảnh báo ≥ 2.5g'},
    door:{val:'Đóng', breach:false, sub:'Chưa mở kể từ khi xuất kho'}
  };
}

function renderShipmentRow(s){
  if(shipmentsEmpty) shipmentsEmpty.remove();
  const wrap = document.createElement('div');
  wrap.dataset.id = s.id;
  const row = document.createElement('div');
  row.className = 'strow';
  row.dataset.id = s.id;
  row.style.cursor = s.iot ? 'pointer' : 'default';
  row.innerHTML = `
    <div class="stid">${s.id}</div>
    <div>${s.routeLabel}</div>
    <div>${s.driver || '—'}</div>
    <div>${s.plate || '—'}</div>
    <div class="stcargo">${s.cargo || '—'}</div>
    <div class="mono">${s.qty || '—'}</div>
    <div class="mono">${s.eta || '—'}</div>
    <div><span class="tier-badge ${s.iot ? 'iot' : 'basic'}">${s.iot ? 'Có IoT' : 'Chỉ GPS'}</span></div>
    <div><button class="st-del" data-id="${s.id}">Xóa</button></div>
  `;

  let detail = null;
  if(s.iot && s.iotData){
    detail = document.createElement('div');
    detail.className = 'strow-detail';
    const cell = (label, x) => `
      <div class="sensor-item ${x.breach ? 'breach':''}">
        <div class="sensor-label">${label}</div>
        <div class="sensor-val ${x.breach ? 'breach':''}">${x.val}${x.unit || ''}</div>
        <div class="sensor-sub">${x.sub}</div>
      </div>`;
    const d = s.iotData;
    const anyBreach = Object.values(d).some(x => x.breach);
    detail.innerHTML = `
      <div class="iot-panel" style="margin:0 18px 12px;">
        <div class="iot-panel-head">
          <span class="iot-dot ${anyBreach ? 'alert':''}"></span>
          Dữ liệu cảm biến IoT trên thùng hàng · cập nhật mỗi 2 phút
        </div>
        <div class="sensor-grid">
          ${cell('Nhiệt độ', d.temp)}
          ${cell('Độ ẩm', d.humidity)}
          ${cell('Va đập', d.shock)}
          ${cell('Cửa thùng', d.door)}
        </div>
      </div>`;
    detail.style.display = 'none';
    row.addEventListener('click', (e) => {
      if(e.target.closest('.st-del')) return;
      detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
    });
  }

  row.querySelector('.st-del').addEventListener('click', (e) => {
    e.stopPropagation();
    userShipments = userShipments.filter(x => x.id !== s.id);
    wrap.remove();
    updateTotalKpi(-1);
    if(s.iot) updateIotKpi(-1);
    drawShipmentDots();
    if(window.vehicleScanApi) window.vehicleScanApi.removeBySourceId(s.id);
    if(window.warehouseScanApi) window.warehouseScanApi.refresh();
    if(userShipments.length === 0){
      const empty = document.createElement('div');
      empty.className = 'shipments-empty';
      empty.id = 'shipmentsEmpty';
      empty.textContent = 'Chưa có chuyến nào được thêm thủ công. Nhấn "+ Thêm chuyến" phía trên để nhập.';
      shipmentsTable.appendChild(empty);
    }
  });
  wrap.appendChild(row);
  if(detail) wrap.appendChild(detail);
  shipmentsTable.appendChild(wrap);
}

tripForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const driver = document.getElementById('tripDriver').value.trim();
  const plate = document.getElementById('tripPlate').value.trim();
  if(!driver || !plate){
    tripFormError.classList.add('show');
    return;
  }
  tripFormError.classList.remove('show');

  const routeKey = tripRouteSelect.value;
  const routeOther = document.getElementById('tripRouteOther').value.trim();
  const routeLabel = routeKey === 'other' ? (routeOther || 'Tuyến khác') : routeLabels[routeKey];

  userShipmentCounter++;
  const idInput = document.getElementById('tripId').value.trim();
  const cargoVal = document.getElementById('tripCargo').value.trim();
  const hasIot = document.getElementById('tripIot').checked;
  const shipment = {
    id: idInput || ('LH-' + userShipmentCounter),
    routeKey: routeKey === 'other' ? null : routeKey,
    routeLabel,
    driver,
    plate,
    cargo: cargoVal,
    qty: document.getElementById('tripQty').value.trim(),
    barcode: document.getElementById('tripBarcode').value.trim(),
    eta: document.getElementById('tripEta').value.trim(),
    iot: hasIot,
    iotData: hasIot ? generateIotReadings(cargoVal) : null
  };
  userShipments.push(shipment);
  renderShipmentRow(shipment);
  updateTotalKpi(1);
  if(shipment.iot) updateIotKpi(1);
  drawShipmentDots();
  if(shipment.iot && window.vehicleScanApi) window.vehicleScanApi.addFromShipment(shipment);
  if(window.warehouseScanApi) window.warehouseScanApi.refresh();
  closeTripModal();

  document.getElementById('shipmentsTable').scrollIntoView({behavior:'smooth', block:'nearest'});
});

/* ---------------- barcode scan simulation (trip modal) ---------------- */
(function(){
  const btn = document.getElementById('tripScanBarcodeBtn');
  const driverPool = ['Nguyễn Văn Hải','Trần Quốc Bảo','Phạm Đức Thịnh','Đỗ Minh Quân','Vũ Anh Tuấn','Lê Thanh Tùng','Hoàng Văn Nam','Bùi Thị Hương'];
  const platePrefixes = ['51D','29H','61C','43C','92H','60C'];
  const cargoPool = ['Hàng khô đóng thùng', 'Hàng đông lạnh', 'Hàng dễ vỡ (gốm sứ)', 'Linh kiện điện tử', 'Thực phẩm khô', 'Hàng tiêu dùng nhanh (FMCG)', 'Dược phẩm bảo quản lạnh'];
  const routeKeys = ['hn','hp','dn','ct','qn'];

  function randPick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randPlate(){ return `${randPick(platePrefixes)}-${100 + Math.floor(Math.random()*900)}.xx`; }
  function randBarcode(){ return '893' + String(Math.floor(1000000000 + Math.random()*8999999999)).slice(0,10); }
  function randEta(){
    const h = String(Math.floor(Math.random()*24)).padStart(2,'0');
    const m = randPick(['00','15','30','45']);
    const d = String(1 + Math.floor(Math.random()*28)).padStart(2,'0');
    const mo = String(9 + Math.floor(Math.random()*2)).padStart(2,'0');
    return `${h}:${m} · ${d}/${mo}`;
  }

  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.classList.add('scanning');
    btn.innerHTML = '<span class="bc-icon">▤</span> Đang đọc mã…';
    setTimeout(() => {
      const cargo = randPick(cargoPool);
      document.getElementById('tripBarcode').value = randBarcode();
      document.getElementById('tripCargo').value = cargo;
      document.getElementById('tripDriver').value = randPick(driverPool);
      document.getElementById('tripPlate').value = randPlate();
      document.getElementById('tripQty').value = 5 + Math.floor(Math.random()*45);
      document.getElementById('tripEta').value = randEta();
      tripRouteSelect.value = randPick(routeKeys);
      tripRouteOtherRow.style.display = 'none';
      const isCold = /lạnh|đông|dược/i.test(cargo);
      document.getElementById('tripIot').checked = isCold || Math.random() < 0.6;

      btn.disabled = false;
      btn.classList.remove('scanning');
      btn.innerHTML = '<span class="bc-icon">▤</span> Quét mã vạch';
    }, 700);
  });
})();

/* ==================================================================
   IOT WAREHOUSE SPACE SCAN SIMULATION (multi-location)
   ================================================================== */
(function(){
  const LABEL_W = 66, TOP_MARGIN = 22;
  const SLOT_W = 70, SLOT_H = 34, GAP_X = 8, GAP_Y = 14;
  const SWEEP_MS = 6000;
  const ROW_LETTERS = ['A','B','C','D','E','F'];

  const locations = [
    { key:'bd', name:'Kho trung tâm Bình Dương', short:'Bình Dương', rows:5, cols:10, isHub:true },
    { key:'hn', name:'Kho trung chuyển Hà Nội', short:'Hà Nội', rows:3, cols:8 },
    { key:'hp', name:'Kho trung chuyển Hải Phòng', short:'Hải Phòng', rows:3, cols:8 },
    { key:'dn', name:'Kho trung chuyển Đà Nẵng', short:'Đà Nẵng', rows:3, cols:8 },
    { key:'ct', name:'Kho trung chuyển Cần Thơ', short:'Cần Thơ', rows:3, cols:7 },
    { key:'qn', name:'Kho trung chuyển Quy Nhơn', short:'Quy Nhơn', rows:3, cols:7 }
  ];

  function slotX(col){ return LABEL_W + col * (SLOT_W + GAP_X); }
  function slotY(row){ return TOP_MARGIN + row * (SLOT_H + GAP_Y); }
  function viewWFor(cols){ return LABEL_W + cols * (SLOT_W + GAP_X) - GAP_X + 14; }
  function viewHFor(rows){ return TOP_MARGIN + rows * (SLOT_H + GAP_Y) - GAP_Y + 14; }

  function buildSlotsFromShipments(loc){
    const totalRows = loc.rows, totalCols = loc.cols;
    const slots = [];
    for(let r = 0; r < totalRows; r++){
      const rowLabel = ROW_LETTERS[r];
      for(let c = 0; c < totalCols; c++){
        const isDockAisle = (r === totalRows - 1 && c >= totalCols - 2);
        slots.push({
          row: r, col: c, rowLabel, code: rowLabel + (c + 1),
          id: null, status: isDockAisle ? 'empty' : 'empty',
          cargo: null, qty: null, sourceId: null,
          temp: null, shock: null, anomalyReason: null,
          cx: slotX(c) + SLOT_W / 2,
          lastFlashPass: -1,
          isDockAisle
        });
      }
    }

    const source = typeof userShipments !== 'undefined' ? userShipments : [];
    const relevant = loc.isHub ? source : source.filter(s => s.routeKey === loc.key);
    const openSlots = slots.filter(s => !s.isDockAisle);

    relevant.forEach((s, i) => {
      const slot = openSlots[i];
      if(!slot) return; // kho đã đầy chỗ hiển thị
      slot.id = 'PLT-' + s.id;
      slot.sourceId = s.id;
      slot.cargo = s.cargo || 'Hàng hóa chưa mô tả';
      slot.qty = s.qty || null;
      slot.status = 'occupied';
      if(s.iot && s.iotData){
        const d = s.iotData;
        if(d.temp && d.temp.breach){
          slot.status = 'anomaly';
          slot.temp = d.temp.val;
          slot.anomalyReason = `nhiệt độ ${d.temp.val}${d.temp.unit} — VƯỢT NGƯỠNG (${d.temp.sub.replace('Ngưỡng an toàn ', '')})`;
        } else if(d.shock && d.shock.breach){
          slot.status = 'anomaly';
          slot.shock = d.shock.val;
          slot.anomalyReason = `phát hiện va đập bất thường ${d.shock.val}${d.shock.unit} trong lúc lưu kho`;
        }
      }
    });

    return slots;
  }

  locations.forEach(loc => {
    loc.slots = buildSlotsFromShipments(loc);
  });

  let activeIdx = 0;

  const svg = document.getElementById('whSvg');
  const chipRow = document.getElementById('whChipRow');
  const panelTitle = document.getElementById('whPanelTitle');
  const panelHint = document.getElementById('whPanelHint');
  const statTotal = document.getElementById('whStatTotal');
  const statOccupied = document.getElementById('whStatOccupied');
  const statEmpty = document.getElementById('whStatEmpty');
  const statAnomaly = document.getElementById('whStatAnomaly');
  const statUsage = document.getElementById('whStatUsage');
  const statusText = document.getElementById('whStatusText');
  const logList = document.getElementById('whLogList');

  function renderChips(){
    chipRow.innerHTML = locations.map((loc, i) => {
      const hasAnomaly = loc.slots.some(s => s.status === 'anomaly');
      return `<button type="button" class="veh-chip ${i === activeIdx ? 'active' : ''}" data-idx="${i}">
        ${hasAnomaly ? '<span class="veh-chip-flag"></span>' : ''}
        <span class="veh-chip-plate">${loc.short}</span>${loc.isHub ? '<span>· Kho trung tâm</span>' : '<span>· Kho trung chuyển</span>'}
      </button>`;
    }).join('');
    chipRow.querySelectorAll('.veh-chip').forEach(btn => {
      btn.addEventListener('click', () => selectLocation(parseInt(btn.dataset.idx, 10)));
    });
  }

  function renderSlots(loc){
    svg.setAttribute('viewBox', `0 0 ${viewWFor(loc.cols)} ${viewHFor(loc.rows)}`);
    let html = '';
    for(let r = 0; r < loc.rows; r++){
      const y = slotY(r);
      html += `<text x="0" y="${y + SLOT_H/2 + 4}" class="wh-row-label">Kệ ${ROW_LETTERS[r]}</text>`;
    }
    loc.slots.forEach(s => {
      const x = slotX(s.col), y = slotY(s.row);
      html += `<g class="wh-slot ${s.status}" data-code="${s.row}-${s.col}">
        <rect class="wh-box" x="${x}" y="${y}" width="${SLOT_W}" height="${SLOT_H}" rx="4"></rect>
        <text x="${x + SLOT_W/2}" y="${y + SLOT_H/2 + 3}" text-anchor="middle">${s.code}</text>
        ${s.status === 'anomaly' ? `<circle class="wh-warn-dot" cx="${x + SLOT_W - 7}" cy="${y + 7}" r="3.5" fill="var(--danger)"></circle>` : ''}
      </g>`;
    });
    svg.innerHTML = html;
  }

  function updateStats(loc){
    const total = loc.slots.length;
    const occupied = loc.slots.filter(s => s.status !== 'empty').length;
    const anomaly = loc.slots.filter(s => s.status === 'anomaly').length;
    statTotal.textContent = total;
    statOccupied.textContent = occupied;
    statEmpty.textContent = total - occupied;
    statAnomaly.textContent = anomaly;
    statUsage.textContent = Math.round((occupied / total) * 100) + '%';
  }

  function updateHead(loc){
    panelTitle.textContent = `Quét không gian ${loc.name} bằng IoT`;
    panelHint.textContent = `Dữ liệu vị trí lấy trực tiếp từ các chuyến trong "Lô hàng"${loc.isHub ? ' (toàn bộ chuyến đang chờ xuất kho)' : ' (các chuyến thuộc tuyến này)'} — cảm biến LiDAR quét toàn bộ kệ hàng mỗi vòng để xác nhận vị trí và tình trạng cảm biến`;
  }

  function pushLog(entries){
    const empty = document.getElementById('whLogEmpty');
    if(empty) empty.remove();
    entries.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'alert-row entering';
      row.innerHTML = `
        <div class="sev-bar ${entry.level}"></div>
        <div class="alert-main">
          <div class="alert-top">
            <span class="alert-id mono">${entry.id}</span>
            <span class="alert-score mono ${entry.level === 'danger' ? 'danger' : ''}"></span>
          </div>
          <div class="alert-title">${entry.title}</div>
          <div class="alert-meta">${entry.meta}</div>
        </div>`;
      logList.insertBefore(row, logList.firstChild);
    });
    while(logList.children.length > 14){ logList.removeChild(logList.lastChild); }
  }

  let passCount = 0, startTime = null, lastFrac = 0;

  function finishPass(){
    const loc = locations[activeIdx];
    passCount++;
    const now = new Date().toLocaleTimeString('vi-VN', {hour12:false});
    const anomalies = loc.slots.filter(s => s.status === 'anomaly');
    const occupiedCount = loc.slots.filter(s => s.status !== 'empty').length;
    const entries = [];
    anomalies.forEach(s => {
      entries.push({
        id: 'IOT-' + s.id,
        level: 'danger',
        title: `${loc.short} · Kệ ${s.rowLabel}, vị trí ${s.col + 1} — ${s.cargo}: ${s.anomalyReason}`,
        meta: `Mã pallet ${s.id} · phát hiện lúc ${now}`
      });
    });
    entries.push({
      id: 'SCAN-' + loc.key.toUpperCase() + '-' + String(passCount).padStart(3, '0'),
      level: 'info',
      title: `Hoàn tất vòng quét #${passCount} tại ${loc.name} — xác nhận ${occupiedCount}/${loc.slots.length} vị trí có hàng, ${anomalies.length} bất thường`,
      meta: `${loc.name} · lúc ${now}`
    });
    pushLog(entries);
    statusText.textContent = `Vòng quét #${passCount} hoàn tất lúc ${now} — đang bắt đầu vòng tiếp theo…`;
  }

  const beam = document.getElementById('whBeam');
  const beamWidthFrac = 0.06;

  function tick(ts){
    const loc = locations[activeIdx];
    if(startTime === null) startTime = ts;
    const elapsed = (ts - startTime) % SWEEP_MS;
    const frac = elapsed / SWEEP_MS; // 0..1
    beam.style.left = (frac * (1 - beamWidthFrac) * 100) + '%';

    const viewW = viewWFor(loc.cols);
    const beamCx = frac * viewW;
    loc.slots.forEach(s => {
      if(s.status === 'empty') return;
      if(Math.abs(s.cx - beamCx) < (SLOT_W / 2 + 8) && s.lastFlashPass !== passCount){
        const el = svg.querySelector(`.wh-slot[data-code="${s.row}-${s.col}"]`);
        if(el){
          el.classList.remove('wh-hit');
          void el.offsetWidth;
          el.classList.add('wh-hit');
        }
        s.lastFlashPass = passCount;
      }
    });

    if(frac < lastFrac){ finishPass(); }
    lastFrac = frac;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function selectLocation(idx){
    activeIdx = idx;
    const loc = locations[activeIdx];
    loc.slots = buildSlotsFromShipments(loc);
    renderChips();
    renderSlots(loc);
    updateStats(loc);
    updateHead(loc);
    passCount = 0; startTime = null; lastFrac = 0;
    logList.innerHTML = '<div class="wh-log-empty" id="whLogEmpty">Đang chờ vòng quét đầu tiên hoàn tất…</div>';
    statusText.textContent = `Đã chuyển sang ${loc.name} — đang quét vòng đầu tiên…`;
  }

  document.getElementById('whRescanBtn').addEventListener('click', () => {
    const loc = locations[activeIdx];
    loc.slots = buildSlotsFromShipments(loc);
    renderChips();
    renderSlots(loc);
    updateStats(loc);
    passCount = 0; startTime = null; lastFrac = 0;
    logList.innerHTML = '<div class="wh-log-empty" id="whLogEmpty">Đang chờ vòng quét đầu tiên hoàn tất…</div>';
    statusText.textContent = 'Đã làm mới từ dữ liệu Lô hàng — đang quét vòng đầu tiên…';
  });

  function refreshFromShipments(){
    locations.forEach(loc => { loc.slots = buildSlotsFromShipments(loc); });
    renderChips();
    const loc = locations[activeIdx];
    renderSlots(loc);
    updateStats(loc);
  }
  window.warehouseScanApi = { refresh: refreshFromShipments };

  renderChips();
  selectLocation(0);
})();

/* ==================================================================
   IOT VEHICLE (TRUCK BED) SCAN SIMULATION
   ================================================================== */
(function(){
  const VIEW_W = 900, VIEW_H = 130;
  const LABEL_W = 70, TOP_MARGIN = 18;
  const COLS = 6;
  const SLOT_W = 118, SLOT_H = 40, GAP_X = 10, GAP_Y = 12;
  const SWEEP_MS = 4500;

  const vehicles = [];

  function slotX(col){ return LABEL_W + col * (SLOT_W + GAP_X); }
  function slotY(row){ return TOP_MARGIN + row * (SLOT_H + GAP_Y); }

  function buildSlots(v){
    const slots = [];
    let seq = 1;
    for(let r = 0; r < 2; r++){
      for(let c = 0; c < COLS; c++){
        const nearDoor = (c === COLS - 1);
        const occupied = !(nearDoor && r === 1) && Math.random() < 0.85;
        slots.push({
          row: r, col: c,
          code: (r === 0 ? 'T' : 'P') + (c + 1),
          id: v.plate.slice(0,3) + '-' + String(100 + seq++),
          status: occupied ? 'occupied' : 'empty',
          cargo: occupied ? v.cargo : null,
          temp: null, shock: null, anomalyReason: null,
          cx: slotX(c) + SLOT_W / 2,
          lastFlashPass: -1
        });
      }
    }
    return slots;
  }

  function rollAnomalies(v, slots){
    slots.forEach(s => { if(s.status !== 'empty'){ s.status = 'occupied'; s.anomalyReason = null; } });
    const occupiedSlots = slots.filter(s => s.status === 'occupied');
    if(occupiedSlots.length === 0) return;

    const forced = [];
    if(v.forceCold) forced.push(occupiedSlots[Math.floor(Math.random() * occupiedSlots.length)]);
    if(v.forceShock) forced.push(occupiedSlots[Math.floor(Math.random() * occupiedSlots.length)]);

    let pool = occupiedSlots.filter(s => !forced.includes(s));
    const extra = Math.random() < 0.4 ? [pool[Math.floor(Math.random() * pool.length)]] : [];
    const picked = [...new Set([...forced, ...extra].filter(Boolean))];

    picked.forEach(s => {
      s.status = 'anomaly';
      const wantCold = v.forceCold && forced.includes(s);
      const wantShock = v.forceShock && forced.includes(s);
      if(wantCold || (!wantShock && /lạnh|đông|dược/i.test(s.cargo) && Math.random() < 0.7)){
        s.temp = +(7 + Math.random() * 5).toFixed(1);
        s.anomalyReason = `nhiệt độ ${s.temp}°C — VƯỢT NGƯỠNG (chuẩn ≤6°C cho hàng lạnh)`;
      } else {
        s.shock = +(2.6 + Math.random() * 1.8).toFixed(1);
        s.anomalyReason = `phát hiện va đập bất thường ${s.shock}g trong lúc vận chuyển`;
      }
    });
  }

  vehicles.forEach(v => {
    v.slots = buildSlots(v);
    rollAnomalies(v, v.slots);
  });

  let activeIdx = 0;

  const svg = document.getElementById('vehSvg');
  const chipRow = document.getElementById('vehChipRow');
  const panelTitle = document.getElementById('vehPanelTitle');
  const panelHint = document.getElementById('vehPanelHint');
  const statTotal = document.getElementById('vehStatTotal');
  const statOccupied = document.getElementById('vehStatOccupied');
  const statEmpty = document.getElementById('vehStatEmpty');
  const statAnomaly = document.getElementById('vehStatAnomaly');
  const statUsage = document.getElementById('vehStatUsage');
  const statusText = document.getElementById('vehStatusText');
  const logList = document.getElementById('vehLogList');
  const beam = document.getElementById('vehBeam');
  const rescanBtn = document.getElementById('vehRescanBtn');

  function renderEmptyState(){
    chipRow.innerHTML = '<div style="font-size:12.5px; color:var(--text-faint);">Chưa có xe nào để quét — sang tab "Lô hàng", bấm "+ Thêm chuyến" và tick "Có IoT" để bắt đầu.</div>';
    panelTitle.textContent = 'Quét khoang xe — chưa có dữ liệu';
    panelHint.textContent = 'Dữ liệu ở đây lấy trực tiếp từ các chuyến có gắn cảm biến IoT trong tab "Lô hàng" — chưa có chuyến nào thì chưa có gì để quét.';
    statTotal.textContent = '—'; statOccupied.textContent = '—'; statEmpty.textContent = '—';
    statAnomaly.textContent = '—'; statUsage.textContent = '—';
    statusText.textContent = 'Đang chờ dữ liệu từ "Lô hàng"…';
    beam.style.display = 'none';
    svg.setAttribute('viewBox', '0 0 900 130');
    svg.innerHTML = `<text x="450" y="68" text-anchor="middle" fill="var(--text-faint)" style="font-family:'Space Grotesk',sans-serif; font-size:14px;">Chưa có xe nào — thêm chuyến có gắn IoT ở tab "Lô hàng"</text>`;
    logList.innerHTML = '<div class="wh-log-empty" id="vehLogEmpty">Chưa có dữ liệu — thêm chuyến có gắn IoT ở tab "Lô hàng" để bắt đầu quét.</div>';
    rescanBtn.disabled = true;
    rescanBtn.style.opacity = '.4';
    rescanBtn.style.cursor = 'not-allowed';
  }

  function renderPopulated(){
    beam.style.display = '';
    rescanBtn.disabled = false;
    rescanBtn.style.opacity = '';
    rescanBtn.style.cursor = '';
    if(activeIdx >= vehicles.length) activeIdx = 0;
    const v = vehicles[activeIdx];
    renderChips();
    renderSlots(v);
    updateStats(v);
    updateHead(v);
  }

  function renderAll(){
    if(vehicles.length === 0){ renderEmptyState(); return; }
    renderPopulated();
  }

  function renderChips(){
    chipRow.innerHTML = vehicles.map((v, i) => {
      const hasAnomaly = v.slots.some(s => s.status === 'anomaly');
      return `<button type="button" class="veh-chip ${i === activeIdx ? 'active' : ''}" data-idx="${i}">
        ${hasAnomaly ? '<span class="veh-chip-flag"></span>' : ''}
        <span class="veh-chip-plate">${v.plate}</span><span>· ${v.routeLabel.replace('Bình Dương → ','')}</span>
        ${v.isUser ? '<span style="color:var(--amber);">· Lô hàng</span>' : ''}
      </button>`;
    }).join('');
    chipRow.querySelectorAll('.veh-chip').forEach(btn => {
      btn.addEventListener('click', () => selectVehicle(parseInt(btn.dataset.idx, 10)));
    });
  }

  function renderSlots(v){
    svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
    let html = '';
    html += `<text x="0" y="${slotY(0) + SLOT_H/2 + 4}" class="wh-row-label">Trái</text>`;
    html += `<text x="0" y="${slotY(1) + SLOT_H/2 + 4}" class="wh-row-label">Phải</text>`;
    v.slots.forEach(s => {
      const x = slotX(s.col), y = slotY(s.row);
      html += `<g class="wh-slot ${s.status}" data-code="${s.row}-${s.col}">
        <rect class="wh-box" x="${x}" y="${y}" width="${SLOT_W}" height="${SLOT_H}" rx="4"></rect>
        <text x="${x + SLOT_W/2}" y="${y + SLOT_H/2 + 3}" text-anchor="middle">${s.code}</text>
        ${s.status === 'anomaly' ? `<circle class="wh-warn-dot" cx="${x + SLOT_W - 9}" cy="${y + 9}" r="4" fill="var(--danger)"></circle>` : ''}
      </g>`;
    });
    svg.innerHTML = html;
  }

  function updateStats(v){
    const total = v.slots.length;
    const occupied = v.slots.filter(s => s.status !== 'empty').length;
    const anomaly = v.slots.filter(s => s.status === 'anomaly').length;
    statTotal.textContent = total;
    statOccupied.textContent = occupied;
    statEmpty.textContent = total - occupied;
    statAnomaly.textContent = anomaly;
    statUsage.textContent = Math.round((occupied / total) * 100) + '%';
  }

  function updateHead(v){
    panelTitle.textContent = `Quét khoang xe ${v.plate} — ${v.routeLabel}`;
    panelHint.textContent = v.isUser
      ? `Tài xế ${v.driver} · Hàng: ${v.cargo} · Nguồn dữ liệu: chuyến tự nhập trong "Lô hàng"`
      : `Tài xế ${v.driver} · Hàng: ${v.cargo} · Cảm biến LiDAR gắn trần khoang quét toàn bộ pallet mỗi vòng`;
  }

  let passCount = 0, startTime = null, lastFrac = 0;
  const beamWidthFrac = 0.08;

  function pushLog(entries){
    const empty = document.getElementById('vehLogEmpty');
    if(empty) empty.remove();
    entries.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'alert-row entering';
      row.innerHTML = `
        <div class="sev-bar ${entry.level}"></div>
        <div class="alert-main">
          <div class="alert-top">
            <span class="alert-id mono">${entry.id}</span>
            <span class="alert-score mono ${entry.level === 'danger' ? 'danger' : ''}"></span>
          </div>
          <div class="alert-title">${entry.title}</div>
          <div class="alert-meta">${entry.meta}</div>
        </div>`;
      logList.insertBefore(row, logList.firstChild);
    });
    while(logList.children.length > 14){ logList.removeChild(logList.lastChild); }
  }

  function finishPass(){
    const v = vehicles[activeIdx];
    passCount++;
    const now = new Date().toLocaleTimeString('vi-VN', {hour12:false});
    const anomalies = v.slots.filter(s => s.status === 'anomaly');
    const occupiedCount = v.slots.filter(s => s.status !== 'empty').length;
    const entries = [];
    anomalies.forEach(s => {
      entries.push({
        id: 'VEH-' + s.id,
        level: 'danger',
        title: `Vị trí ${s.code} trên xe ${v.plate} — ${s.cargo}: ${s.anomalyReason}`,
        meta: `Tuyến ${v.routeLabel} · Tài xế ${v.driver} · phát hiện lúc ${now}`
      });
    });
    entries.push({
      id: 'SCAN-' + v.plate.slice(0,3) + '-' + String(passCount).padStart(3, '0'),
      level: 'info',
      title: `Hoàn tất vòng quét #${passCount} trên xe ${v.plate} — xác nhận ${occupiedCount}/${v.slots.length} vị trí có hàng, ${anomalies.length} bất thường`,
      meta: `Khoang chứa hàng · ${v.routeLabel} · lúc ${now}`
    });
    pushLog(entries);
    statusText.textContent = `Vòng quét #${passCount} hoàn tất lúc ${now} — đang bắt đầu vòng tiếp theo…`;
  }

  function tick(ts){
    if(vehicles.length === 0){ requestAnimationFrame(tick); return; }
    const v = vehicles[activeIdx];
    if(startTime === null) startTime = ts;
    const elapsed = (ts - startTime) % SWEEP_MS;
    const frac = elapsed / SWEEP_MS;
    beam.style.left = (frac * (1 - beamWidthFrac) * 100) + '%';

    const beamCx = frac * VIEW_W;
    v.slots.forEach(s => {
      if(s.status === 'empty') return;
      if(Math.abs(s.cx - beamCx) < (SLOT_W / 2 + 8) && s.lastFlashPass !== passCount){
        const el = svg.querySelector(`.wh-slot[data-code="${s.row}-${s.col}"]`);
        if(el){ el.classList.remove('wh-hit'); void el.offsetWidth; el.classList.add('wh-hit'); }
        s.lastFlashPass = passCount;
      }
    });

    if(frac < lastFrac){ finishPass(); }
    lastFrac = frac;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function selectVehicle(idx){
    activeIdx = idx;
    passCount = 0; startTime = null; lastFrac = 0;
    renderAll();
    if(vehicles.length === 0) return;
    const v = vehicles[activeIdx];
    logList.innerHTML = '<div class="wh-log-empty" id="vehLogEmpty">Đang chờ vòng quét đầu tiên hoàn tất…</div>';
    statusText.textContent = `Đã chuyển sang xe ${v.plate} — đang quét vòng đầu tiên…`;
  }

  document.getElementById('vehRescanBtn').addEventListener('click', () => {
    if(vehicles.length === 0) return;
    const v = vehicles[activeIdx];
    rollAnomalies(v, v.slots);
    renderChips();
    renderSlots(v);
    updateStats(v);
    passCount = 0; startTime = null; lastFrac = 0;
    logList.innerHTML = '<div class="wh-log-empty" id="vehLogEmpty">Đang chờ vòng quét đầu tiên hoàn tất…</div>';
    statusText.textContent = 'Đã khởi động lại — đang quét vòng đầu tiên…';
  });

  // ---- pull vehicles from "Lô hàng" (user-added shipments with IoT) ----
  function addVehicleFromShipment(shipment){
    if(vehicles.some(v => v.sourceId === shipment.id)) return;
    const v = {
      key: 'user-' + shipment.id,
      plate: shipment.plate || shipment.id,
      driver: shipment.driver || '—',
      routeLabel: shipment.routeLabel || 'Tuyến tự nhập',
      cargo: shipment.cargo || 'Hàng hóa chưa mô tả',
      sourceId: shipment.id,
      isUser: true
    };
    v.slots = buildSlots(v);

    const d = shipment.iotData;
    const occupiedSlots = v.slots.filter(s => s.status === 'occupied');
    if(d && occupiedSlots.length){
      if(d.temp && d.temp.breach){
        const s = occupiedSlots[Math.floor(Math.random() * occupiedSlots.length)];
        s.status = 'anomaly';
        s.anomalyReason = `nhiệt độ ${d.temp.val}${d.temp.unit} — VƯỢT NGƯỠNG (${d.temp.sub.replace('Ngưỡng an toàn ', '')})`;
      }
      if(d.shock && d.shock.breach){
        const pool = occupiedSlots.filter(s => s.status !== 'anomaly');
        const chosen = (pool.length ? pool : occupiedSlots)[Math.floor(Math.random() * (pool.length || occupiedSlots.length))];
        chosen.status = 'anomaly';
        chosen.anomalyReason = `phát hiện va đập bất thường ${d.shock.val}${d.shock.unit} trong lúc vận chuyển`;
      }
    } else {
      rollAnomalies(v, v.slots);
    }

    vehicles.push(v);
    selectVehicle(vehicles.length - 1);
  }

  function removeVehicleBySourceId(id){
    const idx = vehicles.findIndex(v => v.sourceId === id);
    if(idx === -1) return;
    vehicles.splice(idx, 1);
    if(activeIdx >= vehicles.length) activeIdx = Math.max(0, vehicles.length - 1);
    selectVehicle(activeIdx);
  }

  window.vehicleScanApi = { addFromShipment: addVehicleFromShipment, removeBySourceId: removeVehicleBySourceId };

  selectVehicle(0);
})();

/* ==================================================================
   XRAY / mmWAVE PACKAGE INSPECTION SIMULATION
   ================================================================== */
(function(){
  const svg = document.getElementById('xraySvg');
  const bayHint = document.getElementById('xrayBayHint');
  const resultEl = document.getElementById('xrayResult');
  const resultSubEl = document.getElementById('xrayResultSub');
  const pendingListEl = document.getElementById('xrayPendingList');
  const logListEl = document.getElementById('xrayLogList');
  const statScanned = document.getElementById('xrayStatScanned');
  const statOk = document.getElementById('xrayStatOk');
  const statBad = document.getElementById('xrayStatBad');
  const statPending = document.getElementById('xrayStatPending');
  const shipmentSelect = document.getElementById('xrayShipment');

  const fragilityLabels = { normal:'Thường', fragile:'Dễ vỡ', 'very-fragile':'Rất dễ vỡ' };
  const fragilityDamageChance = { normal:0.08, fragile:0.3, 'very-fragile':0.55 };
  const damageTypes = ['nứt một đường dài', 'vỡ một mảng nhỏ', 'rạn nứt lan rộng', 'móp méo nặng', 'vỡ góc'];
  const damageLocations = ['góc trên bên trái', 'góc trên bên phải', 'góc dưới bên trái', 'góc dưới bên phải', 'giữa thân kiện hàng', 'đáy kiện hàng'];
  const descPool = ['Thùng gốm sứ men lam', 'Hộp linh kiện điện tử', 'Kiện hàng thủy tinh', 'Thùng trái cây đóng gói', 'Hộp dược phẩm', 'Kiện đồ trang trí sành sứ'];

  let pendingItems = [];
  let scanQueue = [];
  let activeItem = null;
  let idCounter = 1;
  let scanTimer = null;

  let countScanned = 0, countOk = 0, countBad = 0;

  function updateStats(){
    statScanned.textContent = countScanned;
    statOk.textContent = countOk;
    statBad.textContent = countBad;
    statPending.textContent = pendingItems.length + scanQueue.length + (activeItem ? 0 : 0);
  }

  function refreshShipmentOptions(){
    const opts = [];
    Object.keys(routeLabels).forEach(key => {
      opts.push(`<option value="route:${key}">${routeLabels[key]} (mặc định)</option>`);
    });
    (typeof userShipments !== 'undefined' ? userShipments : []).forEach(s => {
      opts.push(`<option value="user:${s.id}">${s.id} — ${s.routeLabel}${s.plate ? ' · ' + s.plate : ''}</option>`);
    });
    const prevVal = shipmentSelect.value;
    shipmentSelect.innerHTML = opts.join('');
    if([...shipmentSelect.options].some(o => o.value === prevVal)) shipmentSelect.value = prevVal;
  }
  refreshShipmentOptions();

  function shipmentLabelFromValue(val){
    if(!val) return 'Chưa gán chuyến';
    if(val.startsWith('route:')){
      const key = val.slice(6);
      return routeLabels[key] + ' (mặc định)';
    }
    const id = val.slice(5);
    const s = (typeof userShipments !== 'undefined' ? userShipments : []).find(x => x.id === id);
    return s ? `${s.id} — ${s.routeLabel}` : id;
  }

  /* ---------- SVG rendering ---------- */
  function drawIdleBox(){
    svg.innerHTML = `
      <rect x="60" y="40" width="200" height="140" rx="6" fill="var(--panel)" stroke="var(--line)" stroke-width="1.5"></rect>
      <line x1="160" y1="40" x2="160" y2="180" stroke="var(--line-soft)" stroke-width="2"></line>
      <line x1="60" y1="110" x2="260" y2="110" stroke="var(--line-soft)" stroke-width="2"></line>
      <text x="160" y="200" text-anchor="middle" fill="var(--text-faint)" style="font-family:'Space Grotesk',sans-serif; font-size:12px;">Khay soi đang trống</text>
    `;
  }
  drawIdleBox();

  function drawScanningFrame(progress, dots){
    const sweepY = 40 + progress * 140;
    let dotsHtml = dots.map(d => `<circle cx="${d.x}" cy="${d.y}" r="1.6" fill="var(--amber)" opacity="${d.o}"></circle>`).join('');
    svg.innerHTML = `
      <rect x="60" y="40" width="200" height="140" rx="6" fill="var(--panel)" stroke="var(--line)" stroke-width="1.5"></rect>
      <clipPath id="xrayClip"><rect x="61" y="41" width="198" height="138" rx="5"></rect></clipPath>
      <g clip-path="url(#xrayClip)">${dotsHtml}</g>
      <line x1="60" y1="${sweepY}" x2="260" y2="${sweepY}" stroke="var(--amber)" stroke-width="2.5"></line>
      <rect x="60" y="${Math.max(40, sweepY - 14)}" width="200" height="14" fill="url(#xrayBeamGrad)" opacity=".5"></rect>
      <defs>
        <linearGradient id="xrayBeamGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--amber)" stop-opacity="0"></stop>
          <stop offset="1" stop-color="var(--amber)" stop-opacity=".5"></stop>
        </linearGradient>
      </defs>
    `;
  }

  function drawResultBox(damaged, damageSpot){
    let extra = '';
    if(damaged){
      const cx = damageSpot.cx, cy = damageSpot.cy;
      extra = `
        <path d="M${cx-18},${cy-14} L${cx-4},${cy-2} L${cx-12},${cy+4} L${cx+6},${cy+16} L${cx+20},${cy+2} L${cx+8},${cy-10} L${cx+18},${cy-18}"
              fill="none" stroke="var(--danger)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"></path>
        <circle cx="${cx}" cy="${cy}" r="3" fill="var(--danger)"></circle>
      `;
    } else {
      extra = `
        <circle cx="160" cy="110" r="26" fill="none" stroke="var(--safe)" stroke-width="2.2"></circle>
        <path d="M148,110 L157,119 L174,100" fill="none" stroke="var(--safe)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
      `;
    }
    svg.innerHTML = `
      <rect x="60" y="40" width="200" height="140" rx="6" fill="var(--panel)" stroke="${damaged ? 'var(--danger)' : 'var(--safe)'}" stroke-width="2"></rect>
      ${extra}
    `;
  }

  /* ---------- pending list rendering ---------- */
  function renderPendingList(){
    if(pendingItems.length === 0){
      pendingListEl.innerHTML = '<div class="wh-log-empty" id="xrayPendingEmpty">Chưa có kiện hàng nào trong danh sách chờ soi.</div>';
      updateStats();
      return;
    }
    pendingListEl.innerHTML = pendingItems.map(item => {
      const isActive = activeItem && activeItem.id === item.id;
      const isQueued = scanQueue.includes(item.id);
      let btnLabel = 'Soi';
      let disabled = false;
      if(isActive){ btnLabel = 'Đang soi…'; disabled = true; }
      else if(isQueued){ btnLabel = 'Đang chờ…'; disabled = true; }
      return `
        <div class="xray-pending-item ${isActive ? 'active-scan' : ''}" data-id="${item.id}">
          <div>
            <div class="xp-main">${item.desc} ${item.barcode ? `<span class="mono" style="color:var(--text-faint); font-size:11.5px;">· ${item.barcode}</span>` : ''}</div>
            <div class="xp-meta">${fragilityLabels[item.fragility]} · SL ${item.qty} · ${item.shipmentLabel}</div>
          </div>
          <button type="button" class="xp-scan-btn" data-id="${item.id}" ${disabled ? 'disabled' : ''}>${btnLabel}</button>
        </div>`;
    }).join('');
    pendingListEl.querySelectorAll('.xp-scan-btn').forEach(btn => {
      btn.addEventListener('click', () => enqueueScan(btn.dataset.id));
    });
    updateStats();
  }

  /* ---------- log ---------- */
  function pushLog(entry){
    const empty = document.getElementById('xrayLogEmpty');
    if(empty) empty.remove();
    const row = document.createElement('div');
    row.className = 'alert-row entering';
    row.innerHTML = `
      <div class="sev-bar ${entry.level}"></div>
      <div class="alert-main">
        <div class="alert-top">
          <span class="alert-id mono">${entry.id}</span>
          <span class="alert-score mono ${entry.level === 'danger' ? 'danger' : ''}"></span>
        </div>
        <div class="alert-title">${entry.title}</div>
        <div class="alert-meta">${entry.meta}</div>
      </div>`;
    logListEl.insertBefore(row, logListEl.firstChild);
    while(logListEl.children.length > 16){ logListEl.removeChild(logListEl.lastChild); }
  }

  /* ---------- scan queue processing ---------- */
  function enqueueScan(id){
    if(activeItem && activeItem.id === id) return;
    if(scanQueue.includes(id)) return;
    scanQueue.push(id);
    renderPendingList();
    processQueue();
  }

  function processQueue(){
    if(activeItem || scanQueue.length === 0) return;
    const id = scanQueue.shift();
    const item = pendingItems.find(x => x.id === id);
    if(!item){ processQueue(); return; }
    activeItem = item;
    renderPendingList();
    runScan(item);
  }

  function runScan(item){
    bayHint.textContent = `Đang soi: ${item.desc} · ${fragilityLabels[item.fragility]} · ${item.shipmentLabel}`;
    resultEl.textContent = '';
    resultEl.className = 'xray-result';
    resultSubEl.textContent = '';

    const dots = [];
    const start = performance.now();
    const duration = 1500;

    if(scanTimer) clearInterval(scanTimer);
    scanTimer = setInterval(() => {
      const elapsed = performance.now() - start;
      const progress = Math.min(1, elapsed / duration);
      for(let i = 0; i < 3; i++){
        dots.push({
          x: 66 + Math.random() * 188,
          y: 40 + progress * 140 - Math.random() * 6,
          o: 0.35 + Math.random() * 0.5
        });
      }
      if(dots.length > 220) dots.splice(0, dots.length - 220);
      drawScanningFrame(progress, dots);

      if(progress >= 1){
        clearInterval(scanTimer);
        setTimeout(() => finishScan(item), 250);
      }
    }, 40);
  }

  function finishScan(item){
    const chance = fragilityDamageChance[item.fragility];
    const damaged = Math.random() < chance;
    const now = new Date().toLocaleTimeString('vi-VN', {hour12:false});

    let damageSpot = null, damageDesc = '';
    if(damaged){
      const type = damageTypes[Math.floor(Math.random() * damageTypes.length)];
      const loc = damageLocations[Math.floor(Math.random() * damageLocations.length)];
      damageDesc = `${type} tại ${loc}`;
      const spots = {
        'góc trên bên trái': {cx:90, cy:65}, 'góc trên bên phải': {cx:230, cy:65},
        'góc dưới bên trái': {cx:90, cy:155}, 'góc dưới bên phải': {cx:230, cy:155},
        'giữa thân kiện hàng': {cx:160, cy:110}, 'đáy kiện hàng': {cx:160, cy:165}
      };
      damageSpot = spots[loc] || {cx:160, cy:110};
    }

    drawResultBox(damaged, damageSpot);
    resultEl.textContent = damaged ? 'HƯ HỎNG — phát hiện bất thường' : 'Nguyên vẹn — không phát hiện hư hỏng';
    resultEl.className = 'xray-result ' + (damaged ? 'bad' : 'ok');
    resultSubEl.textContent = damaged ? `${item.desc}: ${damageDesc}` : `${item.desc}: kiểm tra point-cloud không phát hiện sai lệch bề mặt`;
    bayHint.textContent = 'Chưa có kiện nào đang soi — bấm "Soi" trên một kiện trong danh sách chờ.';

    pushLog({
      id: 'XRAY-' + String(countScanned + 1).padStart(3, '0'),
      level: damaged ? 'danger' : 'info',
      title: damaged
        ? `${item.desc} (${item.barcode || 'không mã'}) — ${damageDesc}`
        : `${item.desc} (${item.barcode || 'không mã'}) — nguyên vẹn, đủ điều kiện xuất kho`,
      meta: `${fragilityLabels[item.fragility]} · SL ${item.qty} · ${item.shipmentLabel} · lúc ${now}`
    });

    countScanned++;
    if(damaged) countBad++; else countOk++;
    pendingItems = pendingItems.filter(x => x.id !== item.id);
    activeItem = null;
    renderPendingList();
    processQueue();
  }

  /* ---------- add item form ---------- */
  document.getElementById('xrayAddBtn').addEventListener('click', () => {
    const desc = document.getElementById('xrayDesc').value.trim() || 'Kiện hàng chưa mô tả';
    const fragility = document.getElementById('xrayFragility').value;
    const qty = document.getElementById('xrayQty').value.trim() || '1';
    const barcode = document.getElementById('xrayBarcode').value.trim();
    const shipmentVal = shipmentSelect.value;
    const item = {
      id: 'XP-' + (idCounter++),
      desc, fragility, qty, barcode,
      shipmentLabel: shipmentLabelFromValue(shipmentVal)
    };
    pendingItems.push(item);
    renderPendingList();

    document.getElementById('xrayDesc').value = '';
    document.getElementById('xrayBarcode').value = '';
    document.getElementById('xrayQty').value = '1';
    document.getElementById('xrayFragility').value = 'normal';
  });

  /* ---------- barcode scan for xray form ---------- */
  (function(){
    const btn = document.getElementById('xrayScanBarcodeBtn');
    const fragilityKeys = ['normal', 'normal', 'fragile', 'fragile', 'very-fragile'];
    btn.addEventListener('click', () => {
      btn.disabled = true;
      btn.classList.add('scanning');
      btn.innerHTML = '<span class="bc-icon">▤</span> Đang đọc mã…';
      setTimeout(() => {
        document.getElementById('xrayBarcode').value = '893' + String(Math.floor(1000000000 + Math.random()*8999999999)).slice(0,10);
        document.getElementById('xrayDesc').value = descPool[Math.floor(Math.random() * descPool.length)];
        document.getElementById('xrayFragility').value = fragilityKeys[Math.floor(Math.random() * fragilityKeys.length)];
        document.getElementById('xrayQty').value = 1 + Math.floor(Math.random() * 30);
        refreshShipmentOptions();
        if(shipmentSelect.options.length){
          shipmentSelect.selectedIndex = Math.floor(Math.random() * shipmentSelect.options.length);
        }
        btn.disabled = false;
        btn.classList.remove('scanning');
        btn.innerHTML = '<span class="bc-icon">▤</span> Quét mã vạch';
      }, 700);
    });
  })();

  window.xrayApi = { onShow: refreshShipmentOptions };

  renderPendingList();
  updateStats();
})();
