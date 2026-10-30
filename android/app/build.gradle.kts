plugins {
    id("com.android.application")
}

// Das Spiel liegt in ../astro-run. Für die App wird es offline-fähig kopiert:
// Three.js und die Schriften kommen aus astro-run/vendor statt aus dem Netz.
val gameDir = rootProject.projectDir.resolve("../astro-run")
val wwwOut = layout.buildDirectory.dir("generated/game-assets")

val copyGame by tasks.registering(Copy::class) {
    from(gameDir) {
        include("index.html", "vendor/**", "audio/audio-data.js")
        into("www")
    }
    filesMatching("**/index.html") {
        filter { line ->
            when {
                line.contains("fonts.googleapis.com/css2") -> "<link rel=\"stylesheet\" href=\"vendor/fonts/fonts.css\">"
                line.contains("rel=\"preconnect\"") -> ""
                else -> line
                    .replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", "vendor/three.min.js")
                    .replace("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/", "vendor/three-examples/")
            }
        }
    }
    into(wwwOut)
}

android {
    namespace = "de.astrorun.game"
    compileSdk = 35

    defaultConfig {
        applicationId = "de.astrorun.game"
        minSdk = 26
        targetSdk = 35
        versionCode = 7
        versionName = "1.5"
    }

    sourceSets["main"].assets.srcDir(wwwOut)

    buildTypes {
        release {
            isMinifyEnabled = false
            // Ohne eigenen Schlüssel mit dem Debug-Schlüssel signieren, damit die APK installierbar ist.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

tasks.named("preBuild") { dependsOn(copyGame) }
