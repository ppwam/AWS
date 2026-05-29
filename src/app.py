import os
from flask import Flask, jsonify, render_template, request
from src.utils import SystemStats, NoteManager, StockManager, CompanyScheduleManager, S3Manager, StressManager

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

@app.route('/feature1')
def feature1():
    """Render the Taiwan limit up stocks page (Feature 1)."""
    return render_template('feature1.html')

@app.route('/feature2')
def feature2():
    """Render the afternoon office company page (Feature 2)."""
    return render_template('feature2.html')

@app.route('/api/feature1', methods=['GET'])
def get_feature1_data():
    """API endpoint returning Taiwan limit up stocks."""
    try:
        data = StockManager.get_limit_up_stocks()
        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/feature2', methods=['GET'])
def get_feature2_data():
    """API endpoint returning companies active in the afternoon."""
    try:
        data = CompanyScheduleManager.get_afternoon_companies()
        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/feature3')
def feature3():
    """Render the S3 Upload dashboard page (Feature 3)."""
    return render_template('feature3.html', bucket_name=S3Manager.BUCKET_NAME, is_configured=S3Manager.is_aws_configured())

@app.route('/api/feature3/files', methods=['GET'])
def get_s3_files():
    """API endpoint to list files from S3 or mock local folder."""
    try:
        res = S3Manager.list_files()
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/feature3/upload', methods=['POST'])
def upload_s3_file():
    """API endpoint to upload a file."""
    try:
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file part in the request"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"status": "error", "message": "No selected file"}), 400
            
        filename = file.filename
        res = S3Manager.upload_file(file, filename)
        
        status_code = 200 if res["status"] == "success" else 500
        return jsonify(res), status_code
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/feature3/delete/<path:filename>', methods=['DELETE'])
def delete_s3_file(filename):
    """API endpoint to delete a file."""
    try:
        res = S3Manager.delete_file(filename)
        status_code = 200 if res["status"] == "success" else 500
        return jsonify(res), status_code
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/feature4')
def feature4():
    """Render the high concurrent traffic and CPU spike simulator page (Feature 4)."""
    return render_template('feature4.html')


@app.route('/api/simulate-load', methods=['GET', 'POST'])
def simulate_load():
    """API endpoint to start/stop or retrieve high load and hardware CPU stress testing state."""
    try:
        if request.method == 'POST':
            data = request.get_json() or {}
            active = data.get('active', False)
            users = int(data.get('users', 0))
            hardware_stress = data.get('hardware_stress', False)
            
            SystemStats.simulated_cpu_spike = active
            SystemStats.simulated_users = users
            
            if active and hardware_stress:
                # Start actual backend multi-core stress indefinitely
                StressManager.start_stress(users_count=users)
            else:
                # Stop any running stress threads
                StressManager.stop_stress()
                
        actual_stress = len(StressManager.active_processes) > 0
        
        return jsonify({
            "status": "success",
            "active": SystemStats.simulated_cpu_spike,
            "users": SystemStats.simulated_users,
            "hardware_stress": actual_stress,
            "message": "Simulation configuration successfully processed."
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

