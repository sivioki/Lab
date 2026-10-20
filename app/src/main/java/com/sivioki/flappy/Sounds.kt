package com.sivioki.flappy

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.SoundPool

/** Short sound effects played through a SoundPool for low latency, plus looping background music. */
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

    private val music: MediaPlayer? = MediaPlayer.create(context, R.raw.music)?.apply {
        isLooping = true
        setVolume(0.35f, 0.35f)
    }
    private var musicWanted = false

    @Volatile var muted = false
        set(value) {
            field = value
            updateMusic()
        }

    /** Call when the game becomes visible. */
    fun startMusic() {
        musicWanted = true
        updateMusic()
    }

    /** Call when the game goes into the background. */
    fun pauseMusic() {
        musicWanted = false
        updateMusic()
    }

    private fun updateMusic() {
        val player = music ?: return
        if (musicWanted && !muted) {
            if (!player.isPlaying) player.start()
        } else if (player.isPlaying) {
            player.pause()
        }
    }

    fun flap() = play(flapId, 0.6f)
    fun point() = play(pointId, 0.8f)
    fun hit() = play(hitId, 1f)
    fun die() = play(dieId, 0.7f)

    private fun play(id: Int, volume: Float) {
        if (!muted) pool.play(id, volume, volume, 1, 0, 1f)
    }

    fun release() {
        pool.release()
        music?.release()
    }
}
