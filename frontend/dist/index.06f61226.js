async function connect() {
    if (typeof window.ethereum !== "undefined") {
        await window.ethereum.request({
            method: "eth_requestAccounts"
        });
        console.log("connected to metmask");
        document.getElementById("connect").innerHTML = "connected";
    } else {
        console.log("No metamask!");
        document.getElementById("connect").innerHTML = "Please install metamask";
    }
}
async function addToWhitelist() {
    document.getElementById("add-whitelist-result").innerHTML = "Success!";
}

//# sourceMappingURL=index.06f61226.js.map
