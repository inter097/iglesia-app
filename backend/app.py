from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2, psycopg2.extras, bcrypt, jwt, os
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
CORS(app)

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
        SELECT ss.*, s.title, s.key, s.content, s.speed, s.bpm, s.is_mvi, s.is_nashville, s.band
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
def add_setlist_song(setlist_id):
    d = request.get_json()
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        INSERT INTO iglesia.setlist_songs (setlist_id, song_id, position, transpose)
        VALUES (%s,%s,%s,%s) RETURNING *
    """, (setlist_id, d.get("song_id"), d.get("position", 0), d.get("transpose", 0)))
    row = dict(cur.fetchone())
    conn.commit(); cur.close(); conn.close()
    return jsonify(row), 201

@app.route("/iglesia/setlists/<setlist_id>/songs/<song_item_id>", methods=["DELETE"])
def remove_setlist_song(setlist_id, song_item_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM iglesia.setlist_songs WHERE id = %s AND setlist_id = %s", (song_item_id, setlist_id))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"deleted": True})

@app.route("/iglesia/setlists/<setlist_id>/songs/<song_item_id>", methods=["PUT"])
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
