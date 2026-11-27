package com.idea2reality.dshino.partner.location

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Lets JavaScript hold the foreground service for as long as it is streaming
 * location. JavaScript already decides when to track, from the booking status,
 * so it is the only thing that should decide when the service runs.
 */
class LocationTrackingModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    /**
     * Android only allows a location foreground service to be started while the
     * app is visible, which is the case here: tracking begins on the active-job
     * screen. A refusal is reported rather than swallowed, so the partner can be
     * told that the customer will lose sight of them once the screen is off.
     */
    @ReactMethod
    fun start(promise: Promise) {
        try {
            val intent = Intent(reactContext, LocationTrackingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject(ERROR_START, error.message, error)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            reactContext.stopService(Intent(reactContext, LocationTrackingService::class.java))
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject(ERROR_STOP, error.message, error)
        }
    }

    companion object {
        const val NAME = "LocationTracking"
        private const val ERROR_START = "E_FOREGROUND_SERVICE_START"
        private const val ERROR_STOP = "E_FOREGROUND_SERVICE_STOP"
    }
}
