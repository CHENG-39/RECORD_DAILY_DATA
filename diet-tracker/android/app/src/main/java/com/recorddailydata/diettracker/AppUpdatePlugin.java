package com.recorddailydata.diettracker;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
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
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private static final int BUFFER_SIZE = 16 * 1024;
    private static final long MAX_APK_BYTES = 200L * 1024L * 1024L;
    private final ExecutorService downloader = Executors.newSingleThreadExecutor();
    private final AtomicBoolean downloadInProgress = new AtomicBoolean(false);
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private static class UpdateValidationException extends Exception {
        final String code;

        UpdateValidationException(String code, String message) {
            super(message);
            this.code = code;
        }
    }

    @PluginMethod
    public void getCurrentVersion(PluginCall call) {
        try {
            PackageInfo packageInfo = getInstalledPackageInfo();
            JSObject result = new JSObject();
            result.put("versionName", packageInfo.versionName);
            result.put("versionCode", getVersionCode(packageInfo));
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Unable to read the installed app version.", "VERSION_READ_FAILED", exception);
        }
    }

    @PluginMethod
    public void getInstallPermissionStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", canInstallPackages());
        call.resolve(result);
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String urlValue = call.getString("url");
        String sha256 = call.getString("sha256");
        String versionName = call.getString("versionName", "update");
        Long versionCode = call.getLong("versionCode");

        if (urlValue == null || !urlValue.startsWith("https://")) {
            call.reject("Only HTTPS update packages are allowed.", "INVALID_UPDATE_URL");
            return;
        }
        if (sha256 == null || !sha256.matches("(?i)^[a-f0-9]{64}$")) {
            call.reject("The update package is missing a valid SHA-256 checksum.", "INVALID_CHECKSUM");
            return;
        }
        if (versionCode == null || versionCode <= 0) {
            call.reject("The update package is missing a valid version code.", "VERSION_MISMATCH");
            return;
        }
        if (!canInstallPackages()) {
            try {
                Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                    .setData(Uri.parse("package:" + getContext().getPackageName()))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(settingsIntent);
                JSObject result = new JSObject();
                result.put("status", "permission_required");
                call.resolve(result);
            } catch (Exception exception) {
                call.reject("Unable to open the install permission settings.", "INSTALL_PERMISSION_UNAVAILABLE", exception);
            }
            return;
        }
        if (!downloadInProgress.compareAndSet(false, true)) {
            call.reject("An update is already being downloaded.", "UPDATE_IN_PROGRESS");
            return;
        }

        downloader.execute(() -> downloadAndInstall(
            call,
            urlValue,
            sha256.toLowerCase(Locale.ROOT),
            versionCode,
            versionName
        ));
    }

    private boolean canInstallPackages() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O
            || getContext().getPackageManager().canRequestPackageInstalls();
    }

    private void downloadAndInstall(PluginCall call, String urlValue, String expectedSha256, long expectedVersionCode, String versionName) {
        HttpURLConnection connection = null;
        File temporaryFile = null;
        try {
            connection = (HttpURLConnection) new URL(urlValue).openConnection();
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(45_000);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("User-Agent", "DietTracker-Android-Updater");
            connection.connect();
            if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300 || !"https".equalsIgnoreCase(connection.getURL().getProtocol())) {
                throw new IllegalStateException("The update server returned an invalid response.");
            }

            long totalBytes = connection.getContentLengthLong();
            if (totalBytes > MAX_APK_BYTES) {
                throw new UpdateValidationException("DOWNLOAD_TOO_LARGE", "The update package is unexpectedly large.");
            }

            File updateDirectory = new File(getContext().getCacheDir(), "updates");
            if (!updateDirectory.exists() && !updateDirectory.mkdirs()) {
                throw new IllegalStateException("Unable to create the update cache directory.");
            }
            cleanUpdateDirectory(updateDirectory);
            temporaryFile = new File(updateDirectory, "diet-tracker-update.tmp");
            File apkFile = new File(updateDirectory, "diet-tracker-" + versionName.replaceAll("[^A-Za-z0-9._-]", "_") + ".apk");

            long downloadedBytes = 0;
            int lastPercentage = -1;
            notifyProgress(0, 0, totalBytes);
            try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(temporaryFile)) {
                byte[] buffer = new byte[BUFFER_SIZE];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    downloadedBytes += read;
                    if (downloadedBytes > MAX_APK_BYTES) {
                        throw new UpdateValidationException("DOWNLOAD_TOO_LARGE", "The update package exceeded the maximum allowed size.");
                    }
                    output.write(buffer, 0, read);
                    int percentage = totalBytes > 0 ? (int) Math.min(100, downloadedBytes * 100 / totalBytes) : 0;
                    if (percentage >= lastPercentage + 2) {
                        lastPercentage = percentage;
                        notifyProgress(percentage, downloadedBytes, totalBytes);
                    }
                }
            }

            if (!expectedSha256.equals(calculateSha256(temporaryFile))) {
                throw new UpdateValidationException("CHECKSUM_MISMATCH", "The downloaded package did not pass its SHA-256 check.");
            }
            verifyPackageCompatibility(temporaryFile, expectedVersionCode, versionName);
            if (apkFile.exists() && !apkFile.delete()) {
                throw new IllegalStateException("Unable to replace the previous update package.");
            }
            if (!temporaryFile.renameTo(apkFile)) {
                throw new IllegalStateException("Unable to finalize the update package.");
            }
            temporaryFile = null;
            notifyProgress(100, downloadedBytes, downloadedBytes);
            openSystemInstaller(call, apkFile);
        } catch (UpdateValidationException exception) {
            rejectOnUiThread(call, exception.getMessage(), exception.code, exception);
        } catch (Exception exception) {
            rejectOnUiThread(call, "Unable to download or verify the update package.", "DOWNLOAD_FAILED", exception);
        } finally {
            downloadInProgress.set(false);
            if (temporaryFile != null && temporaryFile.exists()) {
                temporaryFile.delete();
            }
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private void verifyPackageCompatibility(File apkFile, long expectedVersionCode, String expectedVersionName) throws Exception {
        PackageManager packageManager = getContext().getPackageManager();
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? PackageManager.GET_SIGNING_CERTIFICATES
            : PackageManager.GET_SIGNATURES;
        PackageInfo archiveInfo = packageManager.getPackageArchiveInfo(apkFile.getAbsolutePath(), flags);
        if (archiveInfo == null) {
            throw new UpdateValidationException("PACKAGE_READ_FAILED", "Android could not read the downloaded package.");
        }
        if (!getContext().getPackageName().equals(archiveInfo.packageName)) {
            throw new UpdateValidationException("PACKAGE_NAME_MISMATCH", "The update package has a different application ID.");
        }
        long archiveVersionCode = getVersionCode(archiveInfo);
        long installedVersionCode = getVersionCode(getInstalledPackageInfo());
        if (archiveVersionCode != expectedVersionCode || !expectedVersionName.equals(archiveInfo.versionName)) {
            throw new UpdateValidationException("VERSION_MISMATCH", "The update package version does not match the update manifest.");
        }
        if (archiveVersionCode <= installedVersionCode) {
            throw new UpdateValidationException("VERSION_NOT_NEWER", "The downloaded package is not newer than the installed app.");
        }

        Set<String> installedSigners = getSigningCertificateDigests(getInstalledPackageInfo(flags));
        Set<String> archiveSigners = getSigningCertificateDigests(archiveInfo);
        installedSigners.retainAll(archiveSigners);
        if (installedSigners.isEmpty()) {
            throw new UpdateValidationException("SIGNATURE_MISMATCH", "The update package is signed by a different certificate.");
        }
    }

    private PackageInfo getInstalledPackageInfo() throws PackageManager.NameNotFoundException {
        return getInstalledPackageInfo(0);
    }

    private PackageInfo getInstalledPackageInfo(int flags) throws PackageManager.NameNotFoundException {
        return getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), flags);
    }

    private long getVersionCode(PackageInfo packageInfo) {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? packageInfo.getLongVersionCode() : packageInfo.versionCode;
    }

    @SuppressWarnings("deprecation")
    private Set<String> getSigningCertificateDigests(PackageInfo packageInfo) throws Exception {
        Signature[] signatures;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            if (packageInfo.signingInfo == null) return new HashSet<>();
            signatures = packageInfo.signingInfo.hasMultipleSigners()
                ? packageInfo.signingInfo.getApkContentsSigners()
                : packageInfo.signingInfo.getSigningCertificateHistory();
        } else {
            signatures = packageInfo.signatures;
        }

        Set<String> digests = new HashSet<>();
        if (signatures == null) return digests;
        for (Signature signature : signatures) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digests.add(toHex(digest.digest(signature.toByteArray())));
        }
        return digests;
    }

    private void cleanUpdateDirectory(File directory) {
        File[] files = directory.listFiles();
        if (files == null) return;
        for (File file : files) {
            if (file.isFile() && (file.getName().endsWith(".apk") || file.getName().endsWith(".tmp"))) {
                file.delete();
            }
        }
    }

    private void notifyProgress(int percentage, long downloadedBytes, long totalBytes) {
        JSObject progress = new JSObject();
        progress.put("percentage", Math.max(0, Math.min(100, percentage)));
        progress.put("downloadedBytes", downloadedBytes);
        progress.put("totalBytes", Math.max(0, totalBytes));
        mainHandler.post(() -> notifyListeners("downloadProgress", progress));
    }

    private void openSystemInstaller(PluginCall call, File apkFile) {
        mainHandler.post(() -> {
            try {
                Uri apkUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apkFile
                );
                Intent installIntent = new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(apkUri, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getContext().startActivity(installIntent);
                JSObject result = new JSObject();
                result.put("status", "installer_opened");
                call.resolve(result);
            } catch (Exception exception) {
                call.reject("Unable to open the Android package installer.", "INSTALLER_UNAVAILABLE", exception);
            }
        });
    }

    private void rejectOnUiThread(PluginCall call, String message, String code, Exception exception) {
        mainHandler.post(() -> call.reject(message, code, exception));
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
        return toHex(digest.digest());
    }

    private String toHex(byte[] values) {
        StringBuilder output = new StringBuilder();
        for (byte value : values) {
            output.append(String.format(Locale.ROOT, "%02x", value));
        }
        return output.toString();
    }
}
