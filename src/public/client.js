const publicVapidKey = "BOWFwnnu5HC497_tNEGHj-xiEJwYHkPuBP6ci-Ktvj0Uzb-Z2Pzss-gs75pBdEhmqkzf4Jj9isTJSN5H3dZuv4c"
console.log('ini test dari client.js')
async function registerServiceWorker() {
    const register = await navigator.serviceWorker.register("./worker.js", {
        scope: "/"
    })

    const subscription = await register.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicVapidKey
    })

    await fetch("/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription),
        headers: {
            "Content-Type": "application/json"
        }
    })
}