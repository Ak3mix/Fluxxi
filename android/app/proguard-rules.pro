# Keep javax.annotation classes used by Google Tink (capacitor-community/sqlite dependency)
-keep class javax.annotation.** { *; }
-dontwarn javax.annotation.**
-keep class com.google.crypto.tink.** { *; }
-dontwarn com.google.crypto.tink.**
