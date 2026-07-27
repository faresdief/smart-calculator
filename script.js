const screen = document.querySelector('.screen');
const buttons = document.querySelectorAll('.btn');

buttons.forEach(button => {
    button.addEventListener('click', (e) => {
        let value = e.target.dataset.num;
        
        // عند الضغط على زر الحذف الكلي C
        if (e.target.classList.contains('btn-clear')) {
            screen.value = '';
            return;
        }
        
        // عند الضغط على زر حذف رقم واحد (السهم)
        if (e.target.classList.contains('btn-delete')) {
            screen.value = screen.value.slice(0, -1);
            return;
        }
        
        // عند الضغط على زر التساوي لحساب النتيجة
        if (e.target.classList.contains('btn-equal')) {
            if (screen.value !== '') {
                try {
                    // حساب المعادلة المكتوبة داخل الشاشة
                    screen.value = eval(screen.value);
                } catch (error) {
                    screen.value = "Error";
                }
            }
            return;
        }

        // معالجة وإضافة الأرقام والعمليات إلى الشاشة
        if (value !== undefined) {
            // منع تكرار العمليات الحسابية المتتالية خلف بعضها مباشرة لعدم حدوث خطأ
            const lastChar = screen.value.slice(-1);
            if (['+', '-', '*', '/'].includes(value) && ['+', '-', '*', '/'].includes(lastChar)) {
                // استبدال العملية القديمة بالجديدة
                screen.value = screen.value.slice(0, -1) + value;
            } else {
                screen.value += value;
            }
        }
    });
});
