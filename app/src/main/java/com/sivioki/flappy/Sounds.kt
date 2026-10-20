package com.sivioki.flappy

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool

/** Short sound effects played through a SoundPool for low latency. */
class Sounds(context: Context) {

    private val pool = SoundPool.Builder()
        .setMaxStreams(4)
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        )
        .build()

    private val flapId = pool.load(context, R.raw.sfx_flap, 1)
    private val pointId = pool.load(context, R.raw.sfx_point, 1)
    private val hitId = pool.load(context, R.raw.sfx_hit, 1)
    private val dieId = pool.load(context, R.raw.sfx_die, 1)

    @Volatile var muted = false

    fun flap() = play(flapId, 0.6f)
    fun point() = play(pointId, 0.8f)
    fun hit() = play(hitId, 1f)
    fun die() = play(dieId, 0.7f)

    private fun play(id: Int, volume: Float) {
        if (!muted) pool.play(id, volume, volume, 1, 0, 1f)
    }

    fun release() = pool.release()
}
