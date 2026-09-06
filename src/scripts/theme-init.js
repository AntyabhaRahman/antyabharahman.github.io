// Storage may be unavailable; the system preference still supplies the initial theme.
(function(h){var s;try{s=localStorage.getItem('theme')}catch{};h.dataset.theme=(s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';h.classList.add('px-wait');setTimeout(function(){h.classList.remove('px-wait')},3000)})(document.documentElement)
