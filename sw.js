var CACHE_NAME = "go-with-the-flow-v25";

var APP_FILES = [
  "index.html",
  "workspace.html",
  "notes.html",
  "preflows.html",
  "manifest.json",
  "images/logo.svg",
  "images/icon-192.png",
  "images/icon-512.png",
  "js/html2pdf.bundle.min.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_FILES);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      var jobs = [];
      for (var i = 0; i < names.length; i++) {
        if (names[i] !== CACHE_NAME) {
          jobs.push(caches.delete(names[i]));
        }
      }
      return Promise.all(jobs);
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request).then(function (response) {
      var address = new URL(request.url);
      if (response && response.status === 200 && address.origin === self.location.origin) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, copy);
        });
      }
      return response;
    }).catch(function () {
      return caches.match(request);
    })
  );
});
