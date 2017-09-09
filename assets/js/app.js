---
---

const ready = (function() {
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    return Promise.resolve();
  } else {
    return new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve);
    })
  }
})();

const loaded = (function() {
  if (document.readyState === 'complete') {
    return Promise.resolve();
  } else {
    return new Promise(resolve => {
      document.addEventListener('load', resolve);
    })
  }
})();

ready.then(function() {
  console.log('ready');
});
