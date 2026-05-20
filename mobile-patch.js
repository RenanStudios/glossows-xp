/* ============================================================
   GLOSSOWS XP — PATCH MOBILE
   Adicione no final do <body>, APÓS o script.js:
   <script src="mobile-patch.js"></script>
   ============================================================ */
(function () {
    'use strict';

    /* ── 1. AVISO DE ROTAÇÃO ──────────────────────────────────────────── */
    function injectRotateWarning() {
        if (document.getElementById('rotate-warning')) return;
        const el = document.createElement('div');
        el.id = 'rotate-warning';
        el.innerHTML = `
            <div class="rotate-icon">📱</div>
            <p>Gire o celular para<br><strong>modo paisagem</strong><br>para melhor experiência!</p>
            <div style="font-size:10px;opacity:0.5;margin-top:4px;">Glossows XP</div>
        `;
        document.body.appendChild(el);
    }
    injectRotateWarning();

    /* ── 2. TOUCH DRAG NAS JANELAS ───────────────────────────────────── */
    let touchDragWin = null;
    let touchOffsetX = 0, touchOffsetY = 0;

    function onTitleBarTouchStart(e) {
        if (e.target.closest('.window-controls')) return;
        const touch = e.touches[0];
        const winEl = e.currentTarget.closest('.window');
        if (!winEl) return;
        e.preventDefault();

        touchDragWin = winEl;
        const rect = winEl.getBoundingClientRect();
        touchOffsetX = touch.clientX - rect.left;
        touchOffsetY = touch.clientY - rect.top;

        // Traz para frente
        if (typeof zIndexCounter !== 'undefined') {
            winEl.style.zIndex = ++zIndexCounter;
        } else {
            winEl.style.zIndex = parseInt(winEl.style.zIndex || 100) + 1;
        }
    }

    function onTouchMove(e) {
        if (!touchDragWin) return;
        e.preventDefault();
        const touch = e.touches[0];
        const taskbarH = 30; // --taskbar-height mobile

        let newLeft = touch.clientX - touchOffsetX;
        let newTop  = touch.clientY - touchOffsetY;

        // Clamp: mantém a janela dentro da tela
        const maxLeft = window.innerWidth  - touchDragWin.offsetWidth;
        const maxTop  = window.innerHeight - touchDragWin.offsetHeight - taskbarH;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop  = Math.max(0, Math.min(newTop,  Math.max(0, maxTop)));

        touchDragWin.style.left = newLeft + 'px';
        touchDragWin.style.top  = newTop  + 'px';
    }

    function onTouchEnd() { touchDragWin = null; }

    document.addEventListener('touchmove',   onTouchMove,  { passive: false });
    document.addEventListener('touchend',    onTouchEnd,   { passive: true });
    document.addEventListener('touchcancel', onTouchEnd,   { passive: true });

    /* Observa novas janelas e anexa touch drag */
    function attachTouch(winEl) {
        const tb = winEl.querySelector('.title-bar');
        if (tb && !tb._mobileTouch) {
            tb.addEventListener('touchstart', onTitleBarTouchStart, { passive: false });
            tb._mobileTouch = true;
        }
    }

    const windowsArea = document.getElementById('windows-area');
    if (windowsArea) {
        new MutationObserver(muts => {
            muts.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType === 1 && n.classList.contains('window')) attachTouch(n);
            }));
        }).observe(windowsArea, { childList: true });
    }
    document.querySelectorAll('.window').forEach(attachTouch);

    /* ── 3. DOUBLE-TAP NA TITLE-BAR = MAXIMIZAR ─────────────────────── */
    let lastTap = 0;
    document.addEventListener('touchstart', function (e) {
        const tb = e.target.closest('.title-bar');
        if (!tb || e.target.closest('.window-controls')) return;
        const now = Date.now();
        if (now - lastTap < 350) {
            const winEl = tb.closest('.window');
            if (winEl && winEl.id && typeof maximizeWindow === 'function') {
                maximizeWindow(winEl.id);
            }
        }
        lastTap = now;
    }, { passive: true });

    /* ── 4. BLOQUEIA PINCH-ZOOM ──────────────────────────────────────── */
    document.addEventListener('gesturestart',  e => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
    document.addEventListener('gestureend',    e => e.preventDefault(), { passive: false });

    /* ── 5. DESATIVA CONTEXT MENU EM TOUCH ───────────────────────────── */
    document.addEventListener('contextmenu', e => {
        if ('ontouchstart' in window) e.preventDefault();
    });

    /* ── 6. MAXIMIZAR JANELA AO ABRIR EM TELAS MUITO PEQUENAS ────────── */
    // Em landscape mobile, janelas abertas ficam maximizadas por padrão
    const _origOpenApp = window.openApp;
    if (typeof _origOpenApp === 'function' && window.innerHeight <= 480) {
        window.openApp = function (appId) {
            _origOpenApp(appId);
            // Aguarda a janela ser criada
            requestAnimationFrame(() => {
                const wins = document.querySelectorAll('.window');
                const lastWin = wins[wins.length - 1];
                if (lastWin && lastWin.id && typeof maximizeWindow === 'function') {
                    maximizeWindow(lastWin.id);
                }
            });
        };
    }

    console.log('[Glossows XP] Mobile patch v2 carregado ✓');
})();
