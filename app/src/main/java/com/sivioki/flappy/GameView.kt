package com.sivioki.flappy

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.view.MotionEvent
import android.view.SurfaceHolder
import android.view.SurfaceView
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.random.Random

/**
 * A small Flappy-Bird-style game drawn entirely with Canvas on a SurfaceView.
 * All sizes are relative to the screen height so the game plays the same on every device.
 */
class GameView(context: Context) : SurfaceView(context), SurfaceHolder.Callback, Runnable {

    private enum class State { READY, PLAYING, GAME_OVER }

    private class Pipe(var x: Float, val gapY: Float, var passed: Boolean = false)
    private class Cloud(var x: Float, val y: Float, val scale: Float, val speed: Float)

    private val prefs = context.getSharedPreferences("flappy", Context.MODE_PRIVATE)
    private val sounds = Sounds(context).apply { muted = prefs.getBoolean("muted", false) }

    @Volatile private var running = false
    private var thread: Thread? = null
    private val lock = Any()

    // Screen dimensions and derived sizes (set in surfaceChanged)
    private var w = 0f
    private var h = 0f
    private var groundY = 0f
    private var birdX = 0f
    private var birdR = 0f
    private var pipeW = 0f
    private var gapH = 0f
    private var pipeSpacing = 0f
    private var gravity = 0f
    private var flapVel = 0f
    private var speed = 0f

    // Game state
    private var state = State.READY
    private var birdY = 0f
    private var birdVel = 0f
    private var score = 0
    private var best = prefs.getInt("best", 0)
    private var newBest = false
    private var time = 0f
    private var groundOffset = 0f
    private var gameOverAt = 0f
    private var flashAlpha = 0f
    private var dieSoundAt = -1f
    private val pipes = ArrayList<Pipe>()
    private val clouds = ArrayList<Cloud>()

    // Paints
    private val skyPaint = Paint()
    private val pipePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(115, 191, 46) }
    private val pipeDarkPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(84, 140, 33) }
    private val pipeLightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(160, 230, 90) }
    private val outlinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(40, 60, 20); style = Paint.Style.STROKE
    }
    private val groundPaint = Paint().apply { color = Color.rgb(222, 216, 149) }
    private val grassPaint = Paint().apply { color = Color.rgb(115, 191, 46) }
    private val grassDarkPaint = Paint().apply { color = Color.rgb(84, 140, 33) }
    private val cloudPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(220, 255, 255, 255) }
    private val birdBodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(248, 213, 44) }
    private val birdBellyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(252, 240, 170) }
    private val wingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
    private val eyePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
    private val pupilPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.BLACK }
    private val beakPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(240, 90, 40) }
    private val birdOutline = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(60, 40, 10); style = Paint.Style.STROKE
    }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE; textAlign = Paint.Align.CENTER; typeface = Typeface.DEFAULT_BOLD
    }
    private val textStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(50, 50, 50); textAlign = Paint.Align.CENTER
        typeface = Typeface.DEFAULT_BOLD; style = Paint.Style.STROKE; strokeJoin = Paint.Join.ROUND
    }
    private val panelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(222, 216, 149) }
    private val panelBorder = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(84, 56, 71); style = Paint.Style.STROKE
    }
    private val panelText = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(84, 56, 71); textAlign = Paint.Align.CENTER; typeface = Typeface.DEFAULT_BOLD
    }
    private val flashPaint = Paint().apply { color = Color.WHITE }
    private val buttonPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(90, 0, 0, 0) }
    private val iconPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
    private val iconStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE; style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND
    }
    private val muteButton = RectF()

    private val rect = RectF()
    private val path = Path()

    init {
        holder.addCallback(this)
        isFocusable = true
    }

    // ---------------------------------------------------------------- lifecycle

    override fun surfaceCreated(holder: SurfaceHolder) {}

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        synchronized(lock) {
            val firstLayout = w == 0f
            w = width.toFloat()
            h = height.toFloat()
            groundY = h * 0.85f
            birdX = w * 0.3f
            birdR = h * 0.025f
            pipeW = h * 0.09f
            gapH = h * 0.24f
            pipeSpacing = max(w * 0.6f, pipeW * 3.2f)
            gravity = h * 2.6f
            flapVel = -h * 0.82f
            speed = h * 0.27f

            outlinePaint.strokeWidth = h * 0.004f
            birdOutline.strokeWidth = h * 0.003f
            panelBorder.strokeWidth = h * 0.006f
            textStroke.strokeWidth = h * 0.012f
            iconStroke.strokeWidth = h * 0.005f
            val b = h * 0.06f
            val m = h * 0.025f
            muteButton.set(w - m - b, m, w - m, m + b)
            skyPaint.shader = LinearGradient(
                0f, 0f, 0f, groundY,
                Color.rgb(78, 192, 202), Color.rgb(170, 230, 235), Shader.TileMode.CLAMP
            )
            if (firstLayout || state == State.READY) reset()
            if (clouds.isEmpty()) {
                repeat(5) {
                    clouds.add(
                        Cloud(
                            Random.nextFloat() * w,
                            h * (0.08f + Random.nextFloat() * 0.4f),
                            0.6f + Random.nextFloat() * 0.8f,
                            0.08f + Random.nextFloat() * 0.12f
                        )
                    )
                }
            }
        }
    }

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        pause()
    }

    fun resume() {
        sounds.startMusic()
        if (running) return
        running = true
        thread = Thread(this, "game-loop").also { it.start() }
    }

    fun release() = sounds.release()

    fun pause() {
        sounds.pauseMusic()
        running = false
        val t = thread ?: return
        if (t !== Thread.currentThread()) {
            try { t.join() } catch (_: InterruptedException) {}
        }
        thread = null
    }

    // ---------------------------------------------------------------- game loop

    override fun run() {
        var last = System.nanoTime()
        while (running) {
            val now = System.nanoTime()
            val dt = min((now - last) / 1_000_000_000f, 1f / 30f)
            last = now

            if (!holder.surface.isValid || w == 0f) {
                try { Thread.sleep(16) } catch (_: InterruptedException) {}
                continue
            }

            synchronized(lock) { update(dt) }

            val canvas = try { holder.lockCanvas() } catch (_: Exception) { null } ?: continue
            try {
                synchronized(lock) { render(canvas) }
            } finally {
                holder.unlockCanvasAndPost(canvas)
            }
        }
    }

    private fun reset() {
        state = State.READY
        birdY = h * 0.45f
        birdVel = 0f
        score = 0
        newBest = false
        dieSoundAt = -1f
        pipes.clear()
    }

    private fun spawnPipe(x: Float) {
        val minGap = h * 0.12f + gapH / 2
        val maxGap = groundY - h * 0.08f - gapH / 2
        pipes.add(Pipe(x, minGap + Random.nextFloat() * (maxGap - minGap)))
    }

    private fun update(dt: Float) {
        time += dt
        flashAlpha = max(0f, flashAlpha - dt * 3f)

        for (c in clouds) {
            c.x -= speed * c.speed * dt * 2f
            if (c.x < -h * 0.2f * c.scale) c.x = w + h * 0.2f * c.scale
        }

        when (state) {
            State.READY -> {
                birdY = h * 0.45f + sin(time * 6f) * h * 0.01f
                groundOffset = (groundOffset + speed * dt) % (h * 0.04f)
            }
            State.PLAYING -> {
                groundOffset = (groundOffset + speed * dt) % (h * 0.04f)
                birdVel += gravity * dt
                birdY += birdVel * dt

                for (p in pipes) p.x -= speed * dt
                pipes.removeAll { it.x + pipeW < 0 }
                val lastX = pipes.lastOrNull()?.x ?: (w - pipeSpacing)
                if (lastX < w + pipeW - pipeSpacing) spawnPipe(lastX + pipeSpacing)

                for (p in pipes) {
                    if (!p.passed && p.x + pipeW < birdX) {
                        p.passed = true
                        score++
                        sounds.point()
                    }
                }

                if (birdY - birdR < 0) {
                    birdY = birdR
                    birdVel = 0f
                }
                if (birdY + birdR >= groundY) die(fellDown = true)
                else if (hitsPipe()) die(fellDown = false)
            }
            State.GAME_OVER -> {
                if (dieSoundAt >= 0f && time >= dieSoundAt) {
                    dieSoundAt = -1f
                    sounds.die()
                }
                // Let the bird fall to the ground after a crash
                if (birdY + birdR < groundY) {
                    birdVel += gravity * dt
                    birdY = min(birdY + birdVel * dt, groundY - birdR)
                }
            }
        }
    }

    private fun hitsPipe(): Boolean {
        val r = birdR * 0.85f // slightly forgiving hitbox
        for (p in pipes) {
            if (birdX + r > p.x && birdX - r < p.x + pipeW) {
                if (birdY - r < p.gapY - gapH / 2 || birdY + r > p.gapY + gapH / 2) return true
            }
        }
        return false
    }

    private fun die(fellDown: Boolean) {
        state = State.GAME_OVER
        gameOverAt = time
        flashAlpha = 1f
        sounds.hit()
        // After hitting a pipe the bird still falls, so the falling sound follows the crash
        if (!fellDown) dieSoundAt = time + 0.25f
        if (score > best) {
            best = score
            newBest = true
            prefs.edit().putInt("best", best).apply()
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (event.actionMasked != MotionEvent.ACTION_DOWN) return true
        synchronized(lock) {
            if (state != State.PLAYING && muteButton.contains(event.x, event.y)) {
                sounds.muted = !sounds.muted
                prefs.edit().putBoolean("muted", sounds.muted).apply()
                return true
            }
            when (state) {
                State.READY -> {
                    state = State.PLAYING
                    birdVel = flapVel
                    spawnPipe(w + pipeW)
                    sounds.flap()
                }
                State.PLAYING -> {
                    birdVel = flapVel
                    sounds.flap()
                }
                State.GAME_OVER -> if (time - gameOverAt > 0.6f) reset()
            }
        }
        return true
    }

    // ---------------------------------------------------------------- rendering

    private fun render(c: Canvas) {
        c.drawRect(0f, 0f, w, groundY, skyPaint)
        for (cl in clouds) drawCloud(c, cl)
        for (p in pipes) drawPipe(c, p)
        drawGround(c)
        drawBird(c)

        when (state) {
            State.READY -> {
                drawOutlinedText(c, "Flappy Vogel", w / 2, h * 0.25f, h * 0.07f)
                drawOutlinedText(c, "Tippen zum Fliegen", w / 2, h * 0.62f, h * 0.035f)
                if (best > 0) drawOutlinedText(c, "Rekord: $best", w / 2, h * 0.68f, h * 0.03f)
            }
            State.PLAYING -> drawOutlinedText(c, score.toString(), w / 2, h * 0.13f, h * 0.08f)
            State.GAME_OVER -> drawGameOver(c)
        }

        if (state != State.PLAYING) drawMuteButton(c)

        if (flashAlpha > 0f) {
            flashPaint.alpha = (flashAlpha * 200).toInt()
            c.drawRect(0f, 0f, w, h, flashPaint)
        }
    }

    private fun drawMuteButton(c: Canvas) {
        val b = muteButton
        c.drawRoundRect(b, b.width() * 0.25f, b.width() * 0.25f, buttonPaint)
        val s = b.width()
        val cx = b.left + s * 0.42f
        val cy = b.centerY()

        // Speaker
        path.reset()
        path.moveTo(cx - s * 0.22f, cy - s * 0.1f)
        path.lineTo(cx - s * 0.1f, cy - s * 0.1f)
        path.lineTo(cx + s * 0.06f, cy - s * 0.24f)
        path.lineTo(cx + s * 0.06f, cy + s * 0.24f)
        path.lineTo(cx - s * 0.1f, cy + s * 0.1f)
        path.lineTo(cx - s * 0.22f, cy + s * 0.1f)
        path.close()
        c.drawPath(path, iconPaint)

        if (sounds.muted) {
            val x = cx + s * 0.2f
            val d = s * 0.1f
            c.drawLine(x - d, cy - d, x + d, cy + d, iconStroke)
            c.drawLine(x - d, cy + d, x + d, cy - d, iconStroke)
        } else {
            rect.set(cx - s * 0.08f, cy - s * 0.16f, cx + s * 0.2f, cy + s * 0.16f)
            c.drawArc(rect, -50f, 100f, false, iconStroke)
            rect.set(cx - s * 0.17f, cy - s * 0.28f, cx + s * 0.29f, cy + s * 0.28f)
            c.drawArc(rect, -50f, 100f, false, iconStroke)
        }
    }

    private fun drawCloud(c: Canvas, cl: Cloud) {
        val s = h * 0.04f * cl.scale
        c.drawCircle(cl.x, cl.y, s, cloudPaint)
        c.drawCircle(cl.x + s * 0.9f, cl.y - s * 0.4f, s * 1.1f, cloudPaint)
        c.drawCircle(cl.x + s * 1.9f, cl.y, s * 0.9f, cloudPaint)
        rect.set(cl.x, cl.y - s * 0.2f, cl.x + s * 1.9f, cl.y + s)
        c.drawRect(rect, cloudPaint)
    }

    private fun drawPipe(c: Canvas, p: Pipe) {
        val top = p.gapY - gapH / 2
        val bottom = p.gapY + gapH / 2
        val capH = h * 0.035f
        val capOver = pipeW * 0.08f

        // Upper pipe
        drawPipeBody(c, p.x, 0f, p.x + pipeW, top - capH)
        drawPipeBody(c, p.x - capOver, top - capH, p.x + pipeW + capOver, top)
        // Lower pipe
        drawPipeBody(c, p.x, bottom + capH, p.x + pipeW, groundY)
        drawPipeBody(c, p.x - capOver, bottom, p.x + pipeW + capOver, bottom + capH)
    }

    private fun drawPipeBody(c: Canvas, l: Float, t: Float, r: Float, b: Float) {
        if (b <= t) return
        val pw = r - l
        c.drawRect(l, t, r, b, pipePaint)
        c.drawRect(l + pw * 0.12f, t, l + pw * 0.28f, b, pipeLightPaint)
        c.drawRect(r - pw * 0.18f, t, r, b, pipeDarkPaint)
        c.drawRect(l, t, r, b, outlinePaint)
    }

    private fun drawGround(c: Canvas) {
        c.drawRect(0f, groundY, w, h, groundPaint)
        val stripe = h * 0.04f
        val grassH = h * 0.02f
        c.drawRect(0f, groundY, w, groundY + grassH, grassPaint)
        var x = -groundOffset
        while (x < w) {
            path.reset()
            path.moveTo(x, groundY + grassH)
            path.lineTo(x + stripe / 2, groundY + grassH)
            path.lineTo(x + stripe, groundY)
            path.lineTo(x + stripe / 2, groundY)
            path.close()
            c.drawPath(path, grassDarkPaint)
            x += stripe
        }
        c.drawLine(0f, groundY, w, groundY, outlinePaint)
        c.drawLine(0f, groundY + grassH, w, groundY + grassH, outlinePaint)
    }

    private fun drawBird(c: Canvas) {
        val angle = when (state) {
            State.READY -> 0f
            else -> (birdVel / -flapVel * 35f).coerceIn(-25f, 90f)
        }
        val r = birdR
        c.save()
        c.translate(birdX, birdY)
        c.rotate(angle)

        // Body
        rect.set(-r * 1.2f, -r, r * 1.2f, r)
        c.drawOval(rect, birdBodyPaint)
        rect.set(-r * 0.6f, 0f, r * 1.0f, r * 0.95f)
        c.drawOval(rect, birdBellyPaint)
        rect.set(-r * 1.2f, -r, r * 1.2f, r)
        c.drawOval(rect, birdOutline)

        // Flapping wing
        val flap = if (state == State.GAME_OVER) 0f else sin(time * 25f)
        rect.set(-r * 1.1f, -r * 0.2f + flap * r * 0.35f, -r * 0.1f, r * 0.45f + flap * r * 0.35f)
        c.drawOval(rect, wingPaint)
        c.drawOval(rect, birdOutline)

        // Eye
        c.drawCircle(r * 0.5f, -r * 0.35f, r * 0.42f, eyePaint)
        c.drawCircle(r * 0.5f, -r * 0.35f, r * 0.42f, birdOutline)
        c.drawCircle(r * 0.65f, -r * 0.33f, r * 0.17f, pupilPaint)

        // Beak
        path.reset()
        path.moveTo(r * 0.8f, -r * 0.05f)
        path.lineTo(r * 1.65f, r * 0.15f)
        path.lineTo(r * 0.8f, r * 0.5f)
        path.close()
        c.drawPath(path, beakPaint)
        c.drawPath(path, birdOutline)

        c.restore()
    }

    private fun drawOutlinedText(c: Canvas, text: String, x: Float, y: Float, size: Float) {
        textStroke.textSize = size
        textPaint.textSize = size
        c.drawText(text, x, y, textStroke)
        c.drawText(text, x, y, textPaint)
    }

    private fun drawGameOver(c: Canvas) {
        drawOutlinedText(c, "Game Over", w / 2, h * 0.27f, h * 0.065f)

        val pw = min(w * 0.75f, h * 0.4f)
        val ph = h * 0.2f
        val left = (w - pw) / 2
        val top = h * 0.33f
        rect.set(left, top, left + pw, top + ph)
        val corner = h * 0.015f
        c.drawRoundRect(rect, corner, corner, panelPaint)
        c.drawRoundRect(rect, corner, corner, panelBorder)

        panelText.textSize = h * 0.025f
        c.drawText("PUNKTE", w / 2 - pw / 4, top + ph * 0.25f, panelText)
        c.drawText("REKORD", w / 2 + pw / 4, top + ph * 0.25f, panelText)
        drawOutlinedText(c, score.toString(), w / 2 - pw / 4, top + ph * 0.62f, h * 0.05f)
        drawOutlinedText(c, best.toString(), w / 2 + pw / 4, top + ph * 0.62f, h * 0.05f)
        if (newBest) {
            panelText.textSize = h * 0.022f
            panelText.color = Color.rgb(230, 80, 40)
            c.drawText("NEUER REKORD!", w / 2, top + ph * 0.88f, panelText)
            panelText.color = Color.rgb(84, 56, 71)
        }

        if (time - gameOverAt > 0.6f) {
            drawOutlinedText(c, "Tippen für neues Spiel", w / 2, h * 0.63f, h * 0.032f)
        }
    }
}
