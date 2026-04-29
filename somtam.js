const firebaseConfig = {
    apiKey: "AIzaSyBS__oDn1BoIBG8TiYQks6mFwQd9sBFn_Q",
    authDomain: "somtam-da7ab.firebaseapp.com",
    databaseURL: "https://somtam-da7ab-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "somtam-da7ab",
    storageBucket: "somtam-da7ab.appspot.com",
    messagingSenderId: "388718531258",
    appId: "1:388718531258:web:f673d147f1c3357d4ea883"
};
firebase.initializeApp(firebaseConfig);

const PROMPTPAY_NUMBER = "0801138627";
const cart = {};
let latestOrderKey = null;
let slipBase64 = null;

const menu = {
    lao: [
        { name: "เหลาม้า+กุ้งสด+หอยแครง", price: 170 },
        { name: "เหลาปูม้า+กุ้งสด", price: 150 },
        { name: "เหลาปูม้า+หอยแครง", price: 160 },
        { name: "เหลากุ้งสด+หอยโข่ง", price: 150 },
        { name: "เหลาหอยแครง/หอยโข่ง", price: 100 },
        { name: "เหลากุ้งสด/กุ้งสุก", price: 100 },
        { name: "เหลาหอยแครง+กุ้งสด", price: 120 }
    ],
    season: [
        { name: "ตำส้มโอ", price: 45 },
        { name: "ตำกระท้อน", price: 45 },
        { name: "ตำมะม่วง", price: 45 },
        { name: "ตำผลไม้", price: 50 },
        { name: "ตำข้าวโพด", price: 45 }
    ],
    tum: [
        { name: "ตำปูม้า+หอยแครง+กุ้งสด", price: 150 },
        { name: "ตำปูม้า+หอยแครง", price: 130 },
        { name: "ตำปูม้า+กุ้งสด", price: 120 },
        { name: "ตำกุ้งสด+หอยแครง", price: 90 },
        { name: "ตำกุ้งสุก", price: 90 },
        { name: "ตำปูม้าสด", price: 90 },
        { name: "ตำหอยแครง", price: 80 },
        { name: "ตำหอยโข่ง", price: 80 },
        { name: "ตำกุ้งสุก+ไข่ลูก", price: 60 },
        { name: "ตำทะเลน้อย", price: 60 },
        { name: "ตำปูปลาร้า", price: 40 },
        { name: "ตำลาว", price: 40 },
        { name: "ตำไทย", price: 40 },
        { name: "ตำโคราช", price: 40 },
        { name: "ตำแดง", price: 40 },
        { name: "ตำถั่วฝักยาว", price: 45 },
        { name: "ตำป่า", price: 55 },
        { name: "ตำซั่ว", price: 55 },
        { name: "ตำเส้นแก้ว", price: 50 },
        { name: "ตำป่าเส้นแก้ว/ขนมจีน", price: 55 },
        { name: "ตำซั่วขนมจีน", price: 45 }
    ],
    topping: [
        { name: "ไข่เค็ม", price: 12 },
        { name: "ไข่เยี่ยวม้า", price: 12 },
        { name: "หมูยอ", price: 10 },
        { name: "หอยดอง", price: 10 },
        { name: "ขนมจีน", price: 5 }
    ]
};

function showTab(tabId, event) {
    // ซ่อนหมวดหมู่อาหารทั้งหมด
    document.querySelectorAll('.menu-section').forEach(section => {
        section.classList.remove('active');
    });
    // ลบสถานะ Active ของปุ่มในเมนูด้านข้าง
    document.querySelectorAll('.menu-link').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // แสดงหมวดหมู่ที่เลือก
    document.getElementById(tabId).classList.add('active');
    
    // เปลี่ยนสีปุ่มที่กดให้เป็น Active
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

function escapeId(name) {
    return btoa(unescape(encodeURIComponent(name))).replace(/=+$/, '');
}

function renderMenus() {
    Object.entries(menu).forEach(([cat, items]) => {
        const container = document.getElementById(cat);
        container.innerHTML = '';
        items.forEach(item => {
            cart[item.name] = 0;
            const div = document.createElement('div');
            div.className = 'menu-item';
            const id = escapeId(item.name);
            div.innerHTML = `
                <h3>${item.name}</h3>
                <p>${item.price} บาท</p>
                <div class="menu-controls">
                    <button onclick="changeQty('${item.name.replace(/'/g, "\\'")}', -1)">-</button>
                    <span id="qty-${id}">0</span>
                    <button onclick="changeQty('${item.name.replace(/'/g, "\\'")}', 1)">+</button>
                </div>
            `;
            container.appendChild(div);
        });
    });
    updateTotalPrice();
    updateOrderSummary();
}

function changeQty(name, delta) {
    cart[name] = Math.max(0, (cart[name] || 0) + delta);
    document.getElementById(`qty-${escapeId(name)}`).textContent = cart[name];
    updateTotalPrice();
    updateOrderSummary();
    validateCheckoutButton();
}

function findPriceByName(name) {
    for (const catItems of Object.values(menu)) {
        const item = catItems.find(i => i.name === name);
        if (item) return item.price;
    }
    return 0;
}

function updateTotalPrice() {
    let total = 0;
    for (const [name, qty] of Object.entries(cart)) {
        if (qty > 0) total += findPriceByName(name) * qty;
    }
    document.getElementById('totalPrice').textContent = total.toFixed(2);
    updatePromptPayQR(total);
}

function updatePromptPayQR(amount) {
    const img = document.getElementById('promptpayQR');
    img.src = `https://promptpay.io/${PROMPTPAY_NUMBER}/${amount.toFixed(2)}.png`;
}

function updateOrderSummary() {
    let summary = '';
    for (const [name, qty] of Object.entries(cart)) {
        if (qty > 0) {
            const price = findPriceByName(name);
            summary += `${name} x${qty} = ${(price * qty).toFixed(2)} บาท\n`;
        }
    }
    document.getElementById('orderSummary').textContent = summary || 'ไม่พบสินค้าในตะกร้า';
}

function selectPayment(btn) {
    document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const method = btn.getAttribute('data-method');
    const promptpaySection = document.getElementById('promptpaySection');
    promptpaySection.style.display = method === 'พร้อมเพย์' ? 'block' : 'none';
    validateCheckoutButton();
}

function handleSlipUpload(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('slipName').textContent = "✅ สลิป: " + file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            slipBase64 = e.target.result;
            validateCheckoutButton();
        };
        reader.readAsDataURL(file);
    } else {
        document.getElementById('slipName').textContent = "";
        slipBase64 = null;
        validateCheckoutButton();
    }
}

function validateCheckoutButton() {
    const btn = document.getElementById('checkoutBtn');
    const activeMethod = document.querySelector('.pay-btn.active').getAttribute('data-method');
    const hasItems = Object.values(cart).some(qty => qty > 0);

    if (!hasItems) {
        btn.disabled = true;
        btn.textContent = "กรุณาเลือกอาหาร";
        return;
    }

    if (activeMethod === 'พร้อมเพย์' && !slipBase64) {
        btn.disabled = true;
        btn.textContent = "กรุณาแนบสลิปโอนเงิน";
    } else {
        btn.disabled = false;
        btn.textContent = "ยืนยันสั่งอาหาร";
    }
}

function playOrderSound() {
    const audio = new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg');
    audio.play();
}

async function sendOrder() {
    const items = [];
    let total = 0;
    for (const [name, qty] of Object.entries(cart)) {
        if (qty > 0) {
            const price = findPriceByName(name);
            total += price * qty;
            items.push({ name, qty, price });
        }
    }

    const customerName = document.getElementById("customerName").value.trim();
    const orderNote = document.getElementById("orderNote").value.trim();
    const paymentMethod = document.querySelector('.pay-btn.active').getAttribute('data-method');

    if (!customerName) {
        alert("กรุณากรอกชื่อลูกค้า");
        return;
    }

    const db = firebase.database();

    try {
        const lastOrderSnap = await db.ref("lastOrderNumber").get();
        let lastOrderNumber = lastOrderSnap.exists() ? lastOrderSnap.val() : 0;

        let newOrderNumber = lastOrderNumber + 1;
        if (newOrderNumber > 9999) newOrderNumber = 1;

        const orderData = {
            orderNumber: newOrderNumber,
            name: customerName,
            items,
            total,
            paymentMethod: paymentMethod,
            slipImage: slipBase64 || "",
            note: orderNote,
            status: "รอทำ", 
            timestamp: new Date().toISOString()
        };

        const orderRef = db.ref("orders").push();
        latestOrderKey = orderRef.key;

        await orderRef.set(orderData);

        showQueuePopup(newOrderNumber);

        await db.ref("lastOrderNumber").set(newOrderNumber);

        playOrderSound();

        document.getElementById('orderIdDisplay').textContent = `หมายเลขคิวของคุณคือ: ${newOrderNumber}`;
        
        listenForOrderStatus(latestOrderKey, newOrderNumber);

        resetCart();

    } catch (err) {
        console.error("ส่งคำสั่งซื้อผิดพลาด:", err);
        alert("เกิดข้อผิดพลาดในการส่งคำสั่งซื้อ");
    }
}

function listenForOrderStatus(orderKey, queueNumber) {
    const db = firebase.database();
    const statusRef = db.ref("orders/" + orderKey + "/status");

    statusRef.on("value", (snapshot) => {
        const currentStatus = snapshot.val();
        
        if (currentStatus === "ทำเสร็จแล้ว") {
            alert(`🎉 อาหารคิวที่ ${queueNumber} ของคุณทำเสร็จเรียบร้อยแล้ว มารับได้เลยครับ!`);
            statusRef.off();
        }
    });
}

function resetCart() {
    Object.keys(cart).forEach(name => {
        cart[name] = 0;
        document.getElementById(`qty-${escapeId(name)}`).textContent = "0";
    });
    document.getElementById('customerName').value = "";
    document.getElementById('orderNote').value = "";
    document.getElementById('slipUpload').value = "";
    document.getElementById('slipName').textContent = "";
    slipBase64 = null;
    
    updateTotalPrice();
    updateOrderSummary();
    validateCheckoutButton();
    document.getElementById('orderIdDisplay').textContent = "";
}

function showQueuePopup(number) {
    document.getElementById("popupQueueNumber").textContent = number;
    document.getElementById("queuePopup").style.display = "flex";
}

function closeQueuePopup() {
    document.getElementById("queuePopup").style.display = "none";
}

function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sideMenuOverlay');
    
    menu.classList.toggle('open');
    
    if (menu.classList.contains('open')) {
        overlay.style.display = 'block';
        setTimeout(() => overlay.classList.add('open'), 10);
    } else {
        overlay.classList.remove('open');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

renderMenus();
validateCheckoutButton();
