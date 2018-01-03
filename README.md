## 2cdn

### Motivation
This service was created to cache and serve unchangable assets like CDN.

### Use
To use the service all you need to do is to strip assets href from protocol name and append it to the service href ([https://2cdn.no/][1]).
For example to serve this README files at this link ([https://gitlab.com/orstavik/two-bun-no/raw/master/README.md][2]) type this address into URL bar: [https://2cdn.no/gitlab.com/orstavik/two-bun-no/raw/master/README.md][3] to save this readme in the current state at the current link.

This service work great in combination with [2min][4] and [2bun][5]. So if you want to bundle, minify and store unchangable result on cdn cloud you can use this link - [https://2cdn.no/2min.no/2bun.no/polygit.org/components/polymer/polymer.html][6].

### Local debugging
First you need to clone repository and install dependencies:
```
git clone https://gitlab.com/orstavik/two-cdn-no
cd two-cdn-no
cd function
npm install
cd..
```
To just serve the service locally you need to use [firebase tools][7]:
```
npm install -g firebase-tools
firebase serve --only functions,hosting
```
To debug the service via Chrome Devtools you need to use [functions emulator][8]:
```
npm install -g @google-cloud/functions-emulator
functions start
functions inspect [nameOfYourFunction]
```
If you function will not be automatically registered by the functions emulator when it start you need to add it manually:
```
functions deploy [nameOfYourFunction] --trigger-http
```

[1]: https://2cdn.no/
[2]: https://gitlab.com/orstavik/two-bun-no/raw/master/README.md
[3]: https://2cdn.no/gitlab.com/orstavik/two-bun-no/raw/master/README.md
[4]: https://gitlab.com/orstavik/two-min-no
[5]: https://gitlab.com/orstavik/two-bun-no
[6]: https://2cdn.no/2min.no/2bun.no/polygit.org/components/polymer/polymer.html
[7]: https://www.npmjs.com/package/firebase-tools
[8]: https://www.npmjs.com/package/@google-cloud/functions-emulator