import os
from flask import Flask, jsonify, render_template, request
from src.utils import SystemStats, NoteManager

# Initialize the Flask application
# Explicitly set static and template folders to be within 'src'
base_dir = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    template_folder=os.path.join(base_dir, 'templates'),
    static_folder=os.path.join(base_dir, 'static')
)

# Initialize NoteManager
note_manager = NoteManager()

@app.route('/')
def index():
    """Render the high-end dashboard home page."""
    return render_template('index.html')

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Retrieve system performance statistics."""
    try:
        stats = SystemStats.get_stats()
        return jsonify({"status": "success", "data": stats}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/notes', methods=['GET'])
def get_notes():
    """Retrieve all saved notes from the persistent store."""
    try:
        notes = note_manager.load_notes()
        return jsonify({"status": "success", "data": notes}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/notes', methods=['POST'])
def add_note():
    """Add a new note to the persistent store."""
    try:
        data = request.get_json() or {}
        content = data.get('content', '').strip()
        
        if not content:
            return jsonify({"status": "error", "message": "Content cannot be empty"}), 400
            
        new_note = note_manager.add_note(content)
        return jsonify({"status": "success", "data": new_note}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Delete a specific note by ID."""
    try:
        success = note_manager.delete_note(note_id)
        if success:
            return jsonify({"status": "success", "message": "Note deleted successfully"}), 200
        else:
            return jsonify({"status": "error", "message": "Note not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
