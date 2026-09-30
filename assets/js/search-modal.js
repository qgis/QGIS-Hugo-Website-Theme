// =============================
// Search modal
// =============================
// Turns the small search box in the context menu into a trigger for a focused,
// full-window search prompt (see layouts/partials/search-modal.html). The
// prompt only collects the query; submitting it navigates to the results page.

(function () {
    var modal = document.getElementById('search-modal');
    var trigger = document.getElementById('search-query');
    var input = document.getElementById('search-modal-query');

    if (modal === null || trigger === null || input === null) {
        return;
    }

    // Where focus should go once the prompt closes.
    var previouslyFocused = null;

    function isOpen() {
        return modal.classList.contains('is-active');
    }

    function focusInput() {
        input.focus({preventScroll: true});
        input.select();
    }

    function open() {
        if (isOpen()) {
            return;
        }
        previouslyFocused = document.activeElement;
        // Carry over whatever has been typed so far, so opening the prompt
        // never costs the visitor their keystrokes.
        if (trigger.value && !input.value) {
            input.value = trigger.value;
        }
        modal.classList.add('is-active');
        // Bulma's is-clipped stops the page behind the prompt from scrolling.
        document.documentElement.classList.add('is-clipped');
        focusInput();
        // The click that opened the prompt is still in flight, and its default
        // action would put the caret back in the trigger. Claim focus again once
        // the browser has finished with the event, or the prompt looks dead.
        requestAnimationFrame(focusInput);
    }

    function close() {
        if (!isOpen()) {
            return;
        }
        modal.classList.remove('is-active');
        document.documentElement.classList.remove('is-clipped');
        if (previouslyFocused !== null && previouslyFocused !== trigger) {
            previouslyFocused.focus();
        } else {
            // Returning focus to the trigger would immediately reopen it.
            trigger.blur();
        }
        previouslyFocused = null;
    }

    // The small box is only ever a trigger, so hand over on any attempt to use
    // it. Without JS it stays a working search field, which is why it is not
    // simply marked readonly in the markup.
    trigger.setAttribute('autocomplete', 'off');
    trigger.setAttribute('readonly', 'readonly');
    // Cancelling mousedown stops the browser giving the trigger focus at all;
    // cancelling focus does nothing, so that alone would leave the caret behind.
    ['mousedown', 'touchstart'].forEach(function (event) {
        trigger.addEventListener(event, function (e) {
            e.preventDefault();
            open();
        });
    });
    // Keyboard and assistive-technology users reach it without a pointer.
    ['focus', 'click'].forEach(function (event) {
        trigger.addEventListener(event, function () {
            open();
        });
    });

    modal.querySelectorAll('[data-search-modal-close]').forEach(function (element) {
        element.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen()) {
            close();
            return;
        }

        // Ctrl/Cmd+K is the conventional shortcut for site search.
        if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (isOpen()) {
                close();
            } else {
                open();
            }
        }
    });

    // Keep focus inside the prompt while it is open.
    modal.addEventListener('keydown', function (e) {
        if (e.key === 'Tab' && isOpen()) {
            e.preventDefault();
            input.focus();
        }
    });
})();
