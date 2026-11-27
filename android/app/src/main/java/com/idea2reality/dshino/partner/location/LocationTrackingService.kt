package com.idea2reality.dshino.partner.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import com.idea2reality.dshino.partner.MainActivity
import com.idea2reality.dshino.partner.R

/**
 * Keeps the app's process alive while the partner is travelling to a customer,
 * so the JavaScript location watcher keeps streaming position after the partner
 * puts the phone away. Android stops delivering locations to, and eventually
 * kills, a backgrounded process without a foreground service.
 *
 * This service only holds the process and shows the notification Android
 * requires. It does not read location or talk to the API: that already happens
 * in JavaScript, which owns the auth token and the retry buffer, and
 * duplicating it here would mean two implementations drifting apart.
 */
class LocationTrackingService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForegroundNotification()
        // The partner's booking status decides when to track, and that lives in
        // JavaScript. Resurrecting this service after a process kill would leave
        // a notification claiming to share a location that nothing is sending.
        return START_NOT_STICKY
    }

    private fun startForegroundNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            createChannel()
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                buildNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
            )
        } else {
            startForeground(NOTIFICATION_ID, buildNotification())
        }
    }

    private fun createChannel() {
        val manager = getSystemService(NotificationManager::class.java) ?: return
        if (manager.getNotificationChannel(CHANNEL_ID) != null) {
            return
        }
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.location_tracking_channel_name),
            // The notification is a legal requirement, not news. Keep it silent.
            NotificationManager.IMPORTANCE_LOW,
        )
        channel.setShowBadge(false)
        channel.description = getString(R.string.location_tracking_channel_description)
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        val openApp = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        return builder
            .setContentTitle(getString(R.string.location_tracking_title))
            .setContentText(getString(R.string.location_tracking_text))
            .setSmallIcon(R.drawable.ic_location_tracking)
            .setContentIntent(openApp)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "dshino_location_tracking"
        private const val NOTIFICATION_ID = 4711
    }
}
