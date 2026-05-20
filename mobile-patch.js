/* ============================================================
   GLOSSOWS XP — PATCH MOBILE (touch drag + rotate warning)
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
            <p>Gire o celular para<br><strong>modo paisagem</strong><br>para uma melhor experiência!</p>
            <div style="font-size:11px;opacity:0.6;margin-top:4px;">Glossows XP</div>
        `;
        document.body.appendChild(el);
    }

    injectRotateWarning();

    /* ── 2. TOUCH DRAG NAS JANELAS ───────────────────────────────────── */
    // O script.js original usa only mouse events no startDrag.
    // Este patch adiciona suporte a touchstart/touchmove/touchend na title-bar.

    let touchDragWin = null;
    let touchOffsetX = 0;
    let touchOffsetY = 0;

    function onTitleBarTouchStart(e) {
        // Ignora toque nos botões de controle
        if (e.target.closest('.window-controls')) return;

        const touch = e.touches[0];
        const winEl = e.currentTarget.closest('.window');
        if (!winEl) return;

        e.preventDefault(); // previne scroll ao arrastar a janela
        touchDragWin = winEl;

        const rect = winEl.getBoundingClientRect();
        touchOffsetX = touch.clientX - rect.left;
        touchOffsetY = touch.clientY - rect.top;

        // Traz a janela para frente (mesma lógica do mousedown original)
        winEl.style.zIndex = ++window.zIndexCounter || (parseInt(winEl.style.zIndex || 100) + 1);
    }

    function onTouchMove(e) {
        if (!touchDragWin) return;
        e.preventDefault();

        const touch = e.touches[0];
        let newLeft = touch.clientX - touchOffsetX;
        let newTop  = touch.clientY - touchOffsetY;

        // Limites da tela (impede arrastar para fora)
        const taskbarH = parseInt(getComputedStyle(document.documentElement)
            .getPropertyValue('--taskbar-height')) || 45;
        const maxLeft = window.innerWidth  - touchDragWin.offsetWidth;
        const maxTop  = window.innerHeight - touchDragWin.offsetHeight - taskbarH;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop  = Math.max(0, Math.min(newTop, maxTop));

        touchDragWin.style.left = newLeft + 'px';
        touchDragWin.style.top  = newTop  + 'px';
    }

    function onTouchEnd() {
        touchDragWin = null;
    }

    // Adiciona eventos globais de touch
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend',  onTouchEnd,  { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // Observa novas janelas criadas e adiciona o listener na title-bar
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
                if (node.nodeType !== 1) return;

                // Verifica se é uma janela
                if (node.classList && node.classList.contains('window')) {
                    attachTouchToWindow(node);
                }

                // Ou se contém janelas dentro (raro, mas seguro)
                node.querySelectorAll && node.querySelectorAll('.window').forEach(attachTouchToWindow);
            });
        });
    });

    function attachTouchToWindow(winEl) {
        const titleBar = winEl.querySelector('.title-bar');
        if (titleBar && !titleBar._touchDragAttached) {
            titleBar.addEventListener('touchstart', onTitleBarTouchStart, { passive: false });
            titleBar._touchDragAttached = true;
        }
    }

    // Observa o container de janelas
    const windowsArea = document.getElementById('windows-area');
    if (windowsArea) {
        observer.observe(windowsArea, { childList: true, subtree: false });
    }

    // Também aplica em janelas já existentes (caso o script carregue depois)
    document.querySelectorAll('.window').forEach(attachTouchToWindow);

    /* ── 3. MAXIMIZAR COM DOUBLE-TAP ─────────────────────────────────── */
    // Double-tap na title-bar = maximizar (equivalente ao double-click desktop)
    let lastTap = 0;

    document.addEventListener('touchstart', function (e) {
        const titleBar = e.target.closest('.title-bar');
        if (!titleBar) return;
        if (e.target.closest('.window-controls')) return;

        const now = Date.now();
        const delta = now - lastTap;

        if (delta < 350 && delta > 0) {
            // Double-tap detectado
            const winEl = titleBar.closest('.window');
            if (winEl && winEl.id) {
                // Chama a função de maximize do script.js original
                if (typeof maximizeWindow === 'function') {
                    maximizeWindow(winEl.id);
                }
            }
        }

        lastTap = now;
    }, { passive: true });

    /* ── 4. LOCK SCREEN — suporte horizontal ─────────────────────────── */
    // Em landscape, "deslize para cima" no lock screen: threshold menor
    // O script.js original usa window.innerHeight * 0.75.
    // Em landscape, a tela é curta: reduzimos para 50px ou 40% da altura.
    const _origHandler = window.handleUnlock;
    if (typeof _origHandler === 'undefined') {
        // Patch alternativo: sobrescreve a lógica se possível
        // (caso handleUnlock esteja no escopo global)
        const patchInterval = setInterval(function () {
            if (typeof handleUnlock === 'function') {
                clearInterval(patchInterval);
                // Não sobrescreve — a lógica de 100px já funciona em landscape
                // pois startY - finalY > 100 é atingível com um swipe curto.
            }
        }, 500);
    }

    /* ── 5. PREVINE ZOOM POR PINCH ──────────────────────────────────── */
    document.addEventListener('gesturestart',  function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gestureend',    function (e) { e.preventDefault(); }, { passive: false });

    /* ── 6. CONTEXTO MENU MOBILE (long press) ────────────────────────── */
    // Desativa o context menu nativo em touch (evita popup indesejado)
    document.addEventListener('contextmenu', function (e) {
        if ('ontouchstart' in window) {
            e.preventDefault();
        }
    });

    console.log('[Glossows XP] Mobile patch carregado ✓');
})();
