# Submit for TestFlight Review

This tool is meant to submit builds that are already uploaded to TestFlight for [Beta App Reviews](https://developer.apple.com/documentation/appstoreconnectapi/prerelease_versions_and_beta_testers/beta_app_review_submissions). This tool uses the [AppStoreConnect API](https://developer.apple.com/documentation/appstoreconnectapi) and authenticate through [API keys](https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api), so it should be compatible with all runners.

## Usage

```yml
- name: 'Submit review for external beta testing'
  uses: shichen85/submit-for-testflight-review@v1
  with: 
    app-id: '123456789'
    bundle-version-string: '0.0.1'
    group-name: 'beta'  
    issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
    api-key-id: ${{ secrets.APPSTORE_API_KEY_ID }}
    api-private-key: ${{ secrets.APPSTORE_API_PRIVATE_KEY }}
```
