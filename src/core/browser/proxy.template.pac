function FindProxyForURL(url, host) {
    // If the dns matches, send direct.
    if (dnsDomainIs(host, "#PATTERN"))
        return "PROXY #IP:8001";

    // DEFAULT RULE:
    return "DIRECT";
}
