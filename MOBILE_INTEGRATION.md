# Mobile App Integration Guide

Complete guide for integrating the Fastify OAuth API with mobile applications (iOS, Android, React Native, Flutter).

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [OAuth Flow for Mobile](#oauth-flow-for-mobile)
4. [Configuration](#configuration)
5. [iOS Integration (Swift)](#ios-integration-swift)
6. [Android Integration (Kotlin)](#android-integration-kotlin)
7. [React Native Integration](#react-native-integration)
8. [Flutter Integration](#flutter-integration)
9. [Token Management](#token-management)
10. [Security Best Practices](#security-best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

This API supports mobile OAuth authentication with Google and Apple Sign-In. The mobile flow differs from web OAuth:

### Web OAuth Flow (Current)
```
User → Browser → Google/Apple → Callback URL → Backend → JWT
```

### Mobile OAuth Flow (New)
```
App → In-App Browser → Google/Apple → Deep Link → App → Send code to API → JWT
```

**Key Differences:**
- Mobile uses **custom URL schemes** or **Universal/App Links**
- Mobile apps receive the authorization code directly
- Apps send the code to dedicated mobile endpoints

---

## Prerequisites

### 1. Configure OAuth Providers

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create/select your project
3. Create OAuth 2.0 Client ID for your mobile platform:
   - **iOS**: Bundle ID (e.g., `com.yourcompany.yourapp`)
   - **Android**: Package name + SHA-1 fingerprint
4. Add authorized redirect URIs:
   ```
   myapp://oauth/callback
   ```

#### Apple Sign-In Setup
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers)
2. Create App ID with Sign in with Apple capability
3. Create Services ID
4. Add redirect URIs:
   ```
   myapp://oauth/callback
   ```

### 2. Backend Environment Variables

Update your `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback        # Web
GOOGLE_REDIRECT_URI_MOBILE=myapp://oauth/callback                         # Mobile

# Apple OAuth
APPLE_CLIENT_ID=com.yourcompany.yourapp.signin
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY_PATH=./keys/apple-private-key.p8
APPLE_REDIRECT_URI=http://localhost:3000/api/auth/apple/callback           # Web
APPLE_REDIRECT_URI_MOBILE=myapp://oauth/callback                           # Mobile
```

### 3. API Endpoints

Your API now exposes these mobile-specific endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/google/mobile` | POST | Exchange Google auth code for JWT |
| `/api/auth/apple/mobile` | POST | Exchange Apple auth code for JWT |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/verify` | GET | Verify JWT token |
| `/api/profile` | GET | Get user profile (requires JWT) |

---

## OAuth Flow for Mobile

### Step-by-Step Flow

```
┌──────────┐         ┌────────┐         ┌──────────────┐         ┌────────┐
│Mobile App│         │ API    │         │ Google/Apple │         │  User  │
└────┬─────┘         └───┬────┘         └──────┬───────┘         └───┬────┘
     │                   │                     │                      │
     │ 1. Request OAuth  │                     │                      │
     │   URL (optional)  │                     │                      │
     ├──────────────────>│                     │                      │
     │                   │                     │                      │
     │ 2. Return auth URL│                     │                      │
     │<──────────────────┤                     │                      │
     │                   │                     │                      │
     │ 3. Open in-app browser with OAuth URL   │                      │
     ├─────────────────────────────────────────>│                      │
     │                   │                     │                      │
     │                   │                     │  4. Show login       │
     │                   │                     ├─────────────────────>│
     │                   │                     │                      │
     │                   │                     │  5. User authenticates│
     │                   │                     │<─────────────────────┤
     │                   │                     │                      │
     │ 6. Redirect: myapp://oauth/callback?code=xyz                   │
     │<─────────────────────────────────────────┤                      │
     │                   │                     │                      │
     │ 7. POST code to   │                     │                      │
     │   /auth/*/mobile  │                     │                      │
     ├──────────────────>│                     │                      │
     │                   │                     │                      │
     │                   │ 8. Verify code &    │                      │
     │                   │    get user info    │                      │
     │                   ├────────────────────>│                      │
     │                   │<────────────────────┤                      │
     │                   │                     │                      │
     │ 9. Return JWT     │                     │                      │
     │<──────────────────┤                     │                      │
     │                   │                     │                      │
     │ 10. Store JWT     │                     │                      │
     │    securely       │                     │                      │
     │                   │                     │                      │
```

---

## iOS Integration (Swift)

### 1. Configure URL Scheme

Add to `Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>myapp</string>
        </array>
        <key>CFBundleURLName</key>
        <string>com.yourcompany.yourapp</string>
    </dict>
</array>
```

### 2. Google Sign-In Implementation

```swift
import AuthenticationServices

class AuthenticationManager: NSObject {
    static let shared = AuthenticationManager()
    private let apiURL = "https://api.yourdomain.com"

    // MARK: - Google OAuth
    func signInWithGoogle() {
        let authURL = "https://accounts.google.com/o/oauth2/v2/auth?" +
            "client_id=YOUR_GOOGLE_CLIENT_ID&" +
            "redirect_uri=myapp://oauth/callback&" +
            "response_type=code&" +
            "scope=openid%20email%20profile"

        guard let url = URL(string: authURL) else { return }

        let session = ASWebAuthenticationSession(
            url: url,
            callbackURLScheme: "myapp"
        ) { [weak self] callbackURL, error in
            guard let self = self,
                  error == nil,
                  let callbackURL = callbackURL,
                  let code = self.extractCode(from: callbackURL) else {
                print("OAuth error: \(error?.localizedDescription ?? "Unknown")")
                return
            }

            self.exchangeGoogleCodeForJWT(code: code)
        }

        session.prefersEphemeralWebBrowserSession = false
        session.presentationContextProvider = self
        session.start()
    }

    private func exchangeGoogleCodeForJWT(code: String) {
        guard let url = URL(string: "\(apiURL)/api/auth/google/mobile") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["code": code]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                print("Network error: \(error?.localizedDescription ?? "Unknown")")
                return
            }

            do {
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                let dataDict = json?["data"] as? [String: Any]
                let tokens = dataDict?["tokens"] as? [String: Any]
                let user = dataDict?["user"] as? [String: Any]

                if let accessToken = tokens?["accessToken"] as? String,
                   let refreshToken = tokens?["refreshToken"] as? String {
                    // Store tokens securely in Keychain
                    KeychainManager.shared.saveToken(accessToken, for: "accessToken")
                    KeychainManager.shared.saveToken(refreshToken, for: "refreshToken")

                    print("User: \(user ?? [:])")
                    // Navigate to main app screen
                }
            } catch {
                print("JSON parsing error: \(error.localizedDescription)")
            }
        }.resume()
    }

    private func extractCode(from url: URL) -> String? {
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        return components?.queryItems?.first(where: { $0.name == "code" })?.value
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding
extension AuthenticationManager: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return ASPresentationAnchor()
    }
}
```

### 3. Apple Sign-In Implementation

```swift
import AuthenticationServices

extension AuthenticationManager {
    func signInWithApple() {
        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        authorizationController.presentationContextProvider = self
        authorizationController.performRequests()
    }
}

// MARK: - ASAuthorizationControllerDelegate
extension AuthenticationManager: ASAuthorizationControllerDelegate {
    func authorizationController(controller: ASAuthorizationController,
                                didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            return
        }

        // Get authorization code and ID token
        guard let authorizationCode = appleIDCredential.authorizationCode,
              let identityToken = appleIDCredential.identityToken,
              let code = String(data: authorizationCode, encoding: .utf8),
              let idToken = String(data: identityToken, encoding: .utf8) else {
            print("Failed to get authorization code or ID token")
            return
        }

        // Extract user info (only available on first sign-in)
        var userString: String?
        if let fullName = appleIDCredential.fullName,
           let givenName = fullName.givenName,
           let familyName = fullName.familyName {
            let userDict = [
                "name": [
                    "firstName": givenName,
                    "lastName": familyName
                ]
            ]
            if let jsonData = try? JSONSerialization.data(withJSONObject: userDict),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                userString = jsonString
            }
        }

        exchangeAppleCodeForJWT(code: code, idToken: idToken, user: userString)
    }

    private func exchangeAppleCodeForJWT(code: String, idToken: String, user: String?) {
        guard let url = URL(string: "\(apiURL)/api/auth/apple/mobile") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: Any] = [
            "code": code,
            "id_token": idToken
        ]
        if let user = user {
            body["user"] = user
        }

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                print("Network error: \(error?.localizedDescription ?? "Unknown")")
                return
            }

            do {
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                let dataDict = json?["data"] as? [String: Any]
                let tokens = dataDict?["tokens"] as? [String: Any]

                if let accessToken = tokens?["accessToken"] as? String,
                   let refreshToken = tokens?["refreshToken"] as? String {
                    KeychainManager.shared.saveToken(accessToken, for: "accessToken")
                    KeychainManager.shared.saveToken(refreshToken, for: "refreshToken")

                    // Navigate to main app screen
                }
            } catch {
                print("JSON parsing error: \(error.localizedDescription)")
            }
        }.resume()
    }

    func authorizationController(controller: ASAuthorizationController,
                                didCompleteWithError error: Error) {
        print("Apple Sign-In error: \(error.localizedDescription)")
    }
}
```

### 4. Keychain Manager (Secure Token Storage)

```swift
import Security

class KeychainManager {
    static let shared = KeychainManager()
    private init() {}

    func saveToken(_ token: String, for key: String) {
        let data = token.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    func getToken(for key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }

        return token
    }

    func deleteToken(for key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
```

---

## Android Integration (Kotlin)

### 1. Configure Deep Link

Add to `AndroidManifest.xml`:

```xml
<activity android:name=".MainActivity">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="myapp"
            android:host="oauth" />
    </intent-filter>
</activity>
```

### 2. Google Sign-In Implementation

```kotlin
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class AuthManager(private val context: Context) {
    private val apiURL = "https://api.yourdomain.com"
    private val client = OkHttpClient()

    fun signInWithGoogle() {
        val authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
                "client_id=YOUR_GOOGLE_CLIENT_ID&" +
                "redirect_uri=myapp://oauth/callback&" +
                "response_type=code&" +
                "scope=openid email profile"

        val customTabsIntent = CustomTabsIntent.Builder().build()
        customTabsIntent.launchUrl(context, Uri.parse(authUrl))
    }

    suspend fun exchangeGoogleCodeForJWT(code: String): Result<TokenResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val json = JSONObject().apply {
                    put("code", code)
                }

                val requestBody = json.toString()
                    .toRequestBody("application/json".toMediaType())

                val request = Request.Builder()
                    .url("$apiURL/api/auth/google/mobile")
                    .post(requestBody)
                    .build()

                val response = client.newCall(request).execute()
                val responseBody = response.body?.string()

                if (response.isSuccessful && responseBody != null) {
                    val jsonResponse = JSONObject(responseBody)
                    val data = jsonResponse.getJSONObject("data")
                    val tokens = data.getJSONObject("tokens")
                    val user = data.getJSONObject("user")

                    val tokenResponse = TokenResponse(
                        accessToken = tokens.getString("accessToken"),
                        refreshToken = tokens.getString("refreshToken"),
                        expiresIn = tokens.getInt("expiresIn")
                    )

                    // Store tokens securely
                    saveTokens(tokenResponse)

                    Result.success(tokenResponse)
                } else {
                    Result.failure(Exception("Authentication failed"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    private fun saveTokens(tokens: TokenResponse) {
        val encryptedPrefs = EncryptedSharedPreferences.create(
            context,
            "auth_prefs",
            MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build(),
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )

        encryptedPrefs.edit()
            .putString("access_token", tokens.accessToken)
            .putString("refresh_token", tokens.refreshToken)
            .apply()
    }
}

data class TokenResponse(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int
)
```

### 3. Handle Deep Link in Activity

```kotlin
class MainActivity : AppCompatActivity() {
    private val authManager by lazy { AuthManager(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Handle OAuth callback
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val uri = intent?.data
        if (uri != null && uri.scheme == "myapp" && uri.host == "oauth") {
            val code = uri.getQueryParameter("code")
            if (code != null) {
                lifecycleScope.launch {
                    val result = authManager.exchangeGoogleCodeForJWT(code)
                    result.onSuccess {
                        // Navigate to main screen
                    }.onFailure {
                        // Show error
                    }
                }
            }
        }
    }
}
```

---

## React Native Integration

### 1. Install Dependencies

```bash
npm install react-native-app-auth
npm install @react-native-async-storage/async-storage
```

### 2. Configure Deep Links

#### iOS (`ios/YourApp/Info.plist`)
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>myapp</string>
        </array>
    </dict>
</array>
```

#### Android (`android/app/src/main/AndroidManifest.xml`)
```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="myapp" android:host="oauth" />
</intent-filter>
```

### 3. Authentication Service

```javascript
import { authorize } from 'react-native-app-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.yourdomain.com';

const googleConfig = {
  issuer: 'https://accounts.google.com',
  clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  redirectUrl: 'myapp://oauth/callback',
  scopes: ['openid', 'email', 'profile'],
};

export const signInWithGoogle = async () => {
  try {
    // Step 1: Get authorization code from Google
    const result = await authorize(googleConfig);

    // Step 2: Exchange code for JWT from your backend
    const response = await fetch(`${API_URL}/api/auth/google/mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: result.authorizationCode,
      }),
    });

    const json = await response.json();

    if (json.success) {
      const { accessToken, refreshToken } = json.data.tokens;

      // Store tokens securely
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);

      return json.data.user;
    }

    throw new Error('Authentication failed');
  } catch (error) {
    console.error('Google Sign-In error:', error);
    throw error;
  }
};

export const getAccessToken = async () => {
  return await AsyncStorage.getItem('accessToken');
};

export const refreshAccessToken = async () => {
  const refreshToken = await AsyncStorage.getItem('refreshToken');

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const json = await response.json();

  if (json.success) {
    await AsyncStorage.setItem('accessToken', json.data.accessToken);
    return json.data.accessToken;
  }

  throw new Error('Token refresh failed');
};
```

---

## Flutter Integration

### 1. Add Dependencies

```yaml
# pubspec.yaml
dependencies:
  flutter_appauth: ^6.0.0
  flutter_secure_storage: ^9.0.0
  http: ^1.1.0
```

### 2. Configure Deep Links

#### iOS (`ios/Runner/Info.plist`)
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>myapp</string>
        </array>
    </dict>
</array>
```

#### Android (`android/app/src/main/AndroidManifest.xml`)
```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="myapp" android:host="oauth" />
</intent-filter>
```

### 3. Authentication Service

```dart
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class AuthService {
  final FlutterAppAuth _appAuth = FlutterAppAuth();
  final FlutterSecureStorage _storage = FlutterSecureStorage();
  static const String _apiUrl = 'https://api.yourdomain.com';

  Future<Map<String, dynamic>> signInWithGoogle() async {
    try {
      // Step 1: Get authorization code from Google
      final result = await _appAuth.authorizeAndExchangeCode(
        AuthorizationTokenRequest(
          'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
          'myapp://oauth/callback',
          issuer: 'https://accounts.google.com',
          scopes: ['openid', 'email', 'profile'],
        ),
      );

      if (result == null) {
        throw Exception('Authorization failed');
      }

      // Step 2: Exchange code for JWT from your backend
      final response = await http.post(
        Uri.parse('$_apiUrl/api/auth/google/mobile'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'code': result.authorizationCode}),
      );

      final json = jsonDecode(response.body);

      if (json['success'] == true) {
        final tokens = json['data']['tokens'];

        // Store tokens securely
        await _storage.write(key: 'accessToken', value: tokens['accessToken']);
        await _storage.write(key: 'refreshToken', value: tokens['refreshToken']);

        return json['data']['user'];
      }

      throw Exception('Authentication failed');
    } catch (e) {
      print('Google Sign-In error: $e');
      rethrow;
    }
  }

  Future<String?> getAccessToken() async {
    return await _storage.read(key: 'accessToken');
  }

  Future<String> refreshAccessToken() async {
    final refreshToken = await _storage.read(key: 'refreshToken');

    if (refreshToken == null) {
      throw Exception('No refresh token available');
    }

    final response = await http.post(
      Uri.parse('$_apiUrl/api/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshToken}),
    );

    final json = jsonDecode(response.body);

    if (json['success'] == true) {
      final newAccessToken = json['data']['accessToken'];
      await _storage.write(key: 'accessToken', value: newAccessToken);
      return newAccessToken;
    }

    throw Exception('Token refresh failed');
  }

  Future<void> logout() async {
    await _storage.deleteAll();
  }
}
```

---

## Token Management

### Automatic Token Refresh

Implement an HTTP interceptor to automatically refresh expired tokens:

**JavaScript/TypeScript Example:**
```javascript
const apiClient = axios.create({
  baseURL: 'https://api.yourdomain.com',
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## Security Best Practices

### 1. Token Storage

| Platform | Recommended Storage |
|----------|---------------------|
| iOS | Keychain Services |
| Android | EncryptedSharedPreferences |
| React Native | react-native-keychain or @react-native-async-storage/async-storage with encryption |
| Flutter | flutter_secure_storage |

### 2. Never Store Tokens in Plain Text

❌ **DON'T:**
```javascript
// Plain AsyncStorage
await AsyncStorage.setItem('token', accessToken);

// LocalStorage
localStorage.setItem('token', accessToken);
```

✅ **DO:**
```javascript
// Encrypted storage or Keychain
await SecureStore.setItemAsync('token', accessToken);
```

### 3. HTTPS Only

Always use HTTPS in production:
```javascript
const API_URL = __DEV__
  ? 'http://localhost:3000'  // Development
  : 'https://api.yourdomain.com';  // Production (HTTPS!)
```

### 4. Certificate Pinning (Advanced)

For high-security apps, implement certificate pinning to prevent man-in-the-middle attacks.

### 5. Auto-Logout on Token Expiry

```javascript
if (isTokenExpired(accessToken)) {
  await logout();
  navigation.navigate('Login');
}
```

---

## Troubleshooting

### Issue 1: Deep Link Not Opening App

**iOS:**
- Verify URL scheme in `Info.plist`
- Check Associated Domains for Universal Links
- Test with `xcrun simctl openurl booted "myapp://oauth/callback?code=test"`

**Android:**
- Verify intent filter in `AndroidManifest.xml`
- Test with `adb shell am start -W -a android.intent.action.VIEW -d "myapp://oauth/callback?code=test"`

### Issue 2: OAuth Code Exchange Fails

**Check:**
1. Authorization code is sent in request body
2. API endpoint is correct (`/api/auth/google/mobile`)
3. Backend redirect URI matches mobile redirect URI
4. Code hasn't expired (valid for ~10 minutes)

### Issue 3: Tokens Not Persisting

**Verify:**
- Keychain/secure storage permissions
- Token is saved after successful authentication
- Token is retrieved before API calls

### Issue 4: CORS Errors

Mobile apps don't have CORS restrictions! If you see CORS errors:
- You're probably testing in a web browser
- Or using a web view without proper configuration

---

## Testing

### Test OAuth Flow Without Real Providers

Use Postman or curl:

```bash
# Test mobile Google OAuth endpoint
curl -X POST http://localhost:3000/api/auth/google/mobile \
  -H "Content-Type: application/json" \
  -d '{"code": "test-code-from-google"}'

# Test token refresh
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your-refresh-token"}'

# Test protected endpoint
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer your-access-token"
```

---

## Support

If you encounter issues:

1. Check API logs: `docker compose logs api`
2. Verify environment variables are set correctly
3. Test endpoints with Postman first
4. Check mobile app logs for errors
5. Verify OAuth provider configuration (Google/Apple Console)

---

**Last Updated:** {{ current_date }}
**API Version:** 1.0.0
