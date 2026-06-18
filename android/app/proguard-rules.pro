# Capacitor bridge and plugins (needed for JS-to-native communication)
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepattributes *Annotation*, JavascriptInterface, Signature

# javax.annotation used by Google Tink (capacitor-community/sqlite dependency)
-keep class javax.annotation.** { *; }
-dontwarn javax.annotation.**
-keep class com.google.crypto.tink.** { *; }
-dontwarn com.google.crypto.tink.**
