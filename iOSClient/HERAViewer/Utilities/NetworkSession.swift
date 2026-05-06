import Foundation

// In DEBUG builds the app connects to the dev server which uses a self-signed
// certificate. We bypass validation only in that configuration; release builds
// use the standard SSL stack against the Apache/Let's Encrypt production cert.
enum NetworkSession {
    static let shared: URLSession = {
        #if DEBUG
        let delegate = SSLBypassDelegate()
        return URLSession(configuration: .default, delegate: delegate, delegateQueue: nil)
        #else
        return URLSession.shared
        #endif
    }()
}

#if DEBUG
private final class SSLBypassDelegate: NSObject, URLSessionDelegate {
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
           let trust = challenge.protectionSpace.serverTrust {
            completionHandler(.useCredential, URLCredential(trust: trust))
        } else {
            completionHandler(.performDefaultHandling, nil)
        }
    }
}
#endif
