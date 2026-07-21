package com.recorddailydata.diettracker;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private static final int BUFFER_SIZE = 16 * 1024;
    private final ExecutorService downloader = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void getCurrentVersion(PluginCall call) {
        try {
            PackageInfo packageInfo = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            JSObject result = new JSObject();
            result.put("versionName", packageInfo.versionName);
            result.put("versionCode", Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? packageInfo.getLongVersionCode() : packageInfo.versionCode);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Unable to read the installed app version.", exception);
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String urlValue = call.getString("url");
        String sha256 = call.getString("sha256");
        String versionName = call.getString("versionName", "update");

        if (urlValue == null || !urlValue.startsWith("https://")) {
            call.reject("Only HTTPS update packages are allowed.");
            return;
        }
        if (sha256 == null || !sha256.matches("(?i)^[a-f0-9]{64}$")) {
            call.reject("The update package is missing a valid SHA-256 checksum.");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            settingsIntent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(settingsIntent);
            JSObject result = new JSObject();
            result.put("status", "permission_required");
            call.resolve(result);
            return;
        }

        downloader.execute(() -> downloadAndInstall(call, urlValue, sha256.toLowerCase(Locale.ROOT), versionName));
    }

    private void downloadAndInstall(PluginCall call, String urlValue, String expectedSha256, String versionName) {
        HttpURLConnection connection = null;
        File temporaryFile = null;
        try {
            connection = (HttpURLConnection) new URL(urlValue).openConnection();
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(30_000);
            connection.setRequestProperty("User-Agent", "DietTracker-Android-Updater");
            connection.connect();
            if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300 || !"https".equalsIgnoreCase(connection.getURL().getProtocol())) {
                throw new IllegalStateException("The update server returned an invalid response.");
            }

            File updateDirectory = new File(getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "updates");
            if (!updateDirectory.exists() && !updateDirectory.mkdirs()) {
                throw new IllegalStateException("Unable to create the update download directory.");
            }
            temporaryFile = new File(updateDirectory, "diet-tracker-update.tmp");
            File apkFile = new File(updateDirectory, "diet-tracker-" + versionName.replaceAll("[^A-Za-z0-9._-]", "_") + ".apk");

            try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(temporaryFile)) {
                byte[] buffer = new byte[BUFFER_SIZE];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    output.write(buffer, 0, read);
                }
            }

            if (!expectedSha256.equals(calculateSha256(temporaryFile))) {
                throw new IllegalStateException("The downloaded package did not pass its security check.");
            }
            if (apkFile.exists() && !apkFile.delete()) {
                throw new IllegalStateException("Unable to replace the previous update package.");
            }
            if (!temporaryFile.renameTo(apkFile)) {
                throw new IllegalStateException("Unable to finalize the update package.");
            }
            temporaryFile = null;

            getActivity().runOnUiThread(() -> {
                Uri apkUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apkFile);
                Intent installIntent = new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(apkUri, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(installIntent);
                JSObject result = new JSObject();
                result.put("status", "installer_opened");
                call.resolve(result);
            });
        } catch (Exception exception) {
            getActivity().runOnUiThread(() -> call.reject("Unable to download or verify the update package.", exception));
        } finally {
            if (temporaryFile != null && temporaryFile.exists()) {
                temporaryFile.delete();
            }
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private String calculateSha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[BUFFER_SIZE];
            int read;
            while ((read = input.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }
        StringBuilder output = new StringBuilder();
        for (byte value : digest.digest()) {
            output.append(String.format(Locale.ROOT, "%02x", value));
        }
        return output.toString();
    }
}
