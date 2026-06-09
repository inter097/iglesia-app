from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import psycopg2, psycopg2.extras, bcrypt, jwt, os, pytz
from datetime import datetime, timedelta, date
from functools import wraps

MTY = pytz.timezone("America/Monterrey")

app = Flask(__name__)
_scheduler_started = False
CORS(app, origins=["https://afc.eliuth.dev"])
limiter = Limiter(get_remote_address, app=app, storage_uri="memory://", default_limits=[])

PG = dict(
    host=os.environ["POSTGRES_HOST"],
    dbname=os.environ["POSTGRES_DB"],
    user=os.environ["POSTGRES_USER"],
    password=os.environ["POSTGRES_PASSWORD"]
)
SECRET = os.environ["JWT_SECRET"]
HASH   = os.environ["ADMIN_PASSWORD_HASH"].encode()
EXPIRY = int(os.environ.get("JWT_EXPIRY_HOURS", 24))

def get_db():
    return psycopg2.connect(**PG)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Token requerido"}), 401
        try:
            jwt.decode(token, SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado"}), 401
        except Exception:
            return jsonify({"error": "Token invalido"}), 401
        return f(*args, **kwargs)
    return decorated

# ── Auth ──────────────────────────────────────────────────────────────────
@app.route("/iglesia/auth/login", methods=["POST"])
@limiter.limit("5 per minute; 20 per hour", error_message="Demasiados intentos, espera un momento.")
def login():
    data = request.get_json()
    password = data.get("password", "").encode()
    if not bcrypt.checkpw(password, HASH):
        return jsonify({"error": "Password incorrecto"}), 401
    token = jwt.encode(
        {"sub": "admin", "exp": datetime.utcnow() + timedelta(hours=EXPIRY)},
        SECRET, algorithm="HS256"
    )
    return jsonify({"token": token})

@app.route("/iglesia/auth/verify", methods=["GET"])
@token_required
def verify():
    return jsonify({"valid": True})

# ── Songs ─────────────────────────────────────────────────────────────────
@app.route("/iglesia/songs", methods=["GET"])
def get_songs():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM iglesia.songs ORDER BY title")
    songs = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify(songs)

@app.route("/iglesia/songs/<song_id>", methods=["GET"])
def get_song(song_id):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM iglesia.songs WHERE id = %s", (song_id,))
    song = cur.fetchone()
    cur.close(); conn.close()
    if not song:
        return jsonify({"error": "No encontrada"}), 404
    return jsonify(dict(song))

@app.route("/iglesia/songs", methods=["POST"])
@token_required
def create_song():
    d = request.get_json()
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        INSERT INTO iglesia.songs (title, key, speed, bpm, content, is_mvi, is_nashville, band, has_error)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
    """, (d.get("title"), d.get("key"), d.get("speed"), d.get("bpm"),
          d.get("content"), d.get("is_mvi", False), d.get("is_nashville", False),
          d.get("band"), d.get("has_error", False)))
    song = dict(cur.fetchone())
    conn.commit(); cur.close(); conn.close()
    return jsonify(song), 201

@app.route("/iglesia/songs/<song_id>", methods=["PUT"])
@token_required
def update_song(song_id):
    d = request.get_json()
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        UPDATE iglesia.songs SET
            title=%s, key=%s, speed=%s, bpm=%s, content=%s,
            is_mvi=%s, is_nashville=%s, band=%s, has_error=%s,
            updated_at=NOW()
        WHERE id=%s RETURNING *
    """, (d.get("title"), d.get("key"), d.get("speed"), d.get("bpm"),
          d.get("content"), d.get("is_mvi", False), d.get("is_nashville", False),
          d.get("band"), d.get("has_error", False), song_id))
    song = cur.fetchone()
    conn.commit(); cur.close(); conn.close()
    if not song:
        return jsonify({"error": "No encontrada"}), 404
    return jsonify(dict(song))

@app.route("/iglesia/songs/<song_id>", methods=["DELETE"])
@token_required
def delete_song(song_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM iglesia.songs WHERE id = %s", (song_id,))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"deleted": True})

@app.route("/iglesia/health", methods=["GET"])
@limiter.exempt
def health():
    return jsonify({"status": "ok"})

# ── Setlists ──────────────────────────────────────────────────────────────
@app.route("/iglesia/setlists", methods=["GET"])
def get_setlists():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM iglesia.setlists ORDER BY day")
    data = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify(data)

@app.route("/iglesia/setlists/<setlist_id>", methods=["GET"])
def get_setlist(setlist_id):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT ss.*, s.title, s.key, s.content, s.speed, s.bpm, s.is_mvi, s.is_nashville, s.band, s.has_error
        FROM iglesia.setlist_songs ss
        JOIN iglesia.songs s ON ss.song_id = s.id
        WHERE ss.setlist_id = %s
        ORDER BY ss.position
    """, (setlist_id,))
    songs = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify(songs)

@app.route("/iglesia/setlists", methods=["POST"])
@token_required
def create_setlist():
    d = request.get_json()
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("INSERT INTO iglesia.setlists (day) VALUES (%s) RETURNING *", (d.get("day"),))
    setlist = dict(cur.fetchone())
    conn.commit(); cur.close(); conn.close()
    return jsonify(setlist), 201

@app.route("/iglesia/setlists/<setlist_id>/songs", methods=["POST"])
@token_required
def add_setlist_song(setlist_id):
    d = request.get_json()
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        INSERT INTO iglesia.setlist_songs (setlist_id, song_id, position, transpose, is_post_message)
        VALUES (%s,%s,%s,%s,%s) RETURNING *
    """, (setlist_id, d.get("song_id"), d.get("position", 0), d.get("transpose", 0), d.get("is_post_message", False)))
    row = dict(cur.fetchone())
    conn.commit(); cur.close(); conn.close()
    return jsonify(row), 201

@app.route("/iglesia/setlists/<setlist_id>/songs/<song_item_id>", methods=["DELETE"])
@token_required
def remove_setlist_song(setlist_id, song_item_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM iglesia.setlist_songs WHERE id = %s AND setlist_id = %s", (song_item_id, setlist_id))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"deleted": True})

@app.route("/iglesia/setlists/<setlist_id>/songs/<song_item_id>", methods=["PUT"])
@token_required
def update_setlist_song(setlist_id, song_item_id):
    d = request.get_json()
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        UPDATE iglesia.setlist_songs SET position=%s, transpose=%s
        WHERE id=%s AND setlist_id=%s RETURNING *
    """, (d.get("position"), d.get("transpose", 0), song_item_id, setlist_id))
    row = cur.fetchone()
    conn.commit(); cur.close(); conn.close()
    return jsonify(dict(row))

@app.route("/iglesia/setlist-songs/all", methods=["GET"])
def get_all_setlist_songs():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT ss.song_id, sl.day
        FROM iglesia.setlist_songs ss
        JOIN iglesia.setlists sl ON ss.setlist_id = sl.id
    """)
    data = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify(data)


# ── is_post_message ────────────────────────────────────────────────────────
@app.route("/iglesia/setlists/<setlist_id>/songs/<song_item_id>/post-message", methods=["PUT"])
@token_required
def toggle_post_message(setlist_id, song_item_id):
    d = request.get_json()
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        UPDATE iglesia.setlist_songs SET is_post_message=%s
        WHERE id=%s AND setlist_id=%s RETURNING *
    """, (d.get("is_post_message", False), song_item_id, setlist_id))
    row = cur.fetchone()
    conn.commit(); cur.close(); conn.close()
    return jsonify(dict(row))


# ── Snapshots ──────────────────────────────────────────────────────────────
def take_snapshot(day: str):
    """Congela el setlist del día como snapshot histórico."""
    today = date.today()
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Obtener setlist del día
        cur.execute("SELECT id FROM iglesia.setlists WHERE day=%s", (day,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close(); return

        setlist_id = row["id"]

        # Crear snapshot (ignorar si ya existe para esta fecha)
        cur.execute("""
            INSERT INTO iglesia.setlist_snapshots (day, service_date)
            VALUES (%s, %s)
            ON CONFLICT (day, service_date) DO NOTHING
            RETURNING id
        """, (day, today))
        snap = cur.fetchone()
        if not snap:
            cur.close(); conn.close(); return  # Ya existía

        snap_id = snap["id"]

        # Copiar canciones al snapshot
        cur.execute("""
            SELECT song_id, position, transpose, is_post_message
            FROM iglesia.setlist_songs WHERE setlist_id=%s ORDER BY position
        """, (setlist_id,))
        songs = cur.fetchall()
        for s in songs:
            cur.execute("""
                INSERT INTO iglesia.setlist_snapshot_songs
                    (snapshot_id, song_id, position, transpose, is_post_message)
                VALUES (%s,%s,%s,%s,%s)
            """, (snap_id, s["song_id"], s["position"], s["transpose"], s["is_post_message"]))

        conn.commit()
        print(f"[snapshot] {day} {today} — {len(songs)} canciones guardadas")
        cur.close(); conn.close()
    except Exception as e:
        print(f"[snapshot] Error: {e}")


@app.route("/iglesia/snapshots", methods=["GET"])
def get_snapshots():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT s.*, COUNT(ss.id) as song_count
        FROM iglesia.setlist_snapshots s
        LEFT JOIN iglesia.setlist_snapshot_songs ss ON ss.snapshot_id = s.id
        GROUP BY s.id
        ORDER BY s.service_date DESC
    """)
    data = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify(data)


@app.route("/iglesia/snapshots/<snapshot_id>", methods=["GET"])
def get_snapshot(snapshot_id):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT ss.*, s.title, s.key, s.speed, s.bpm, s.band
        FROM iglesia.setlist_snapshot_songs ss
        JOIN iglesia.songs s ON ss.song_id = s.id
        WHERE ss.snapshot_id = %s
        ORDER BY ss.position
    """, (snapshot_id,))
    data = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify(data)


@app.route("/iglesia/snapshots/stats", methods=["GET"])
def snapshot_stats():
    """Frecuencia de canciones en el historial."""
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT s.title, s.key, s.band, snap.day,
               COUNT(*) as veces,
               MAX(snap.service_date) as ultima_vez
        FROM iglesia.setlist_snapshot_songs ss
        JOIN iglesia.songs s ON ss.song_id = s.id
        JOIN iglesia.setlist_snapshots snap ON ss.snapshot_id = snap.id
        GROUP BY s.id, s.title, s.key, s.band, snap.day
        ORDER BY veces DESC
    """)
    data = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify(data)


# ── Scheduler ─────────────────────────────────────────────────────────────
def start_scheduler():
    global _scheduler_started
    if _scheduler_started:
        return
    _scheduler_started = True
    scheduler = BackgroundScheduler(timezone=MTY)
    # Domingo 10:45am
    scheduler.add_job(lambda: take_snapshot("domingo"),
        CronTrigger(day_of_week="sun", hour=10, minute=45, timezone=MTY))
    # Miércoles 8:15pm
    scheduler.add_job(lambda: take_snapshot("miercoles"),
        CronTrigger(day_of_week="wed", hour=20, minute=15, timezone=MTY))
    # Sábado 6:30pm
    scheduler.add_job(lambda: take_snapshot("sabado"),
        CronTrigger(day_of_week="sat", hour=18, minute=30, timezone=MTY))
    scheduler.start()
    print("[scheduler] Snapshots activados — Dom 10:45, Mié 20:15, Sáb 18:30 hora Monterrey")


start_scheduler()  # funciona tanto con gunicorn como directo

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
