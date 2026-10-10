(function () {
    var pageName = window.location.pathname.split('/').pop().toLowerCase();
    if (!pageName || pageName === 'index.html' || pageName === 'v100.html') return;

    window.addEventListener('message', function (event) {
        var frame = document.querySelector('iframe');
        if (frame && event.source === frame.contentWindow
            && event.data && event.data.type === 'pengu-navigate-home') {
            window.location.replace('index.html');
        }
    });

    window.addEventListener('pageshow', function (event) {
        var navigation = performance.getEntriesByType('navigation')[0];
        if (event.persisted || (navigation && navigation.type === 'back_forward')) {
            window.location.replace('index.html');
        }
    });
})();
