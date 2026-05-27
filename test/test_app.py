import os
import sys
import json
import pytest

# Ensure the root workspace directory is in the python path for importing src
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.app import app
from src.utils import NoteManager

@pytest.fixture
def client():
    """Configure a Flask test client for running endpoint tests."""
    app.config['TESTING'] = True
    
    # Configure a separate test notes file path to avoid overwriting production data
    test_notes_file = os.path.join(os.path.dirname(__file__), 'test_notes.json')
    app.config['NOTE_MANAGER_FILE'] = test_notes_file
    
    # Temporarily override the app's note manager with the test one
    original_manager = app.view_functions['get_notes'].__globals__['note_manager']
    test_manager = NoteManager(filepath=test_notes_file)
    
    # Clear any previous test notes
    test_manager.save_notes([])
    
    app.view_functions['get_notes'].__globals__['note_manager'] = test_manager
    app.view_functions['add_note'].__globals__['note_manager'] = test_manager
    app.view_functions['delete_note'].__globals__['note_manager'] = test_manager
    
    with app.test_client() as client:
        yield client
        
    # Restore the original note manager and clean up the test file
    app.view_functions['get_notes'].__globals__['note_manager'] = original_manager
    app.view_functions['add_note'].__globals__['note_manager'] = original_manager
    app.view_functions['delete_note'].__globals__['note_manager'] = original_manager
    
    if os.path.exists(test_notes_file):
        try:
            os.remove(test_notes_file)
        except Exception:
            pass


def test_index_page(client):
    """Test that the home page renders and returns 200 OK."""
    response = client.get('/')
    assert response.status_code == 200
    assert b'Workspace Hub' in response.data
    assert b'System Realtime Performance Monitor' in response.data


def test_get_stats_endpoint(client):
    """Test that the system stats API endpoint yields appropriate structure."""
    response = client.get('/api/stats')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data['status'] == 'success'
    assert 'data' in data
    
    stats = data['data']
    assert 'cpu' in stats
    assert 'percent' in stats['cpu']
    assert 'memory' in stats
    assert 'disk' in stats
    assert 'os_name' in stats
    assert 'uptime' in stats


def test_notes_crud_lifecycle(client):
    """Test full GET, POST, and DELETE lifecycle on the notes API."""
    # 1. Initially notes should be empty
    response = client.get('/api/notes')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'success'
    assert len(data['data']) == 0

    # 2. Add a new note
    note_content = "This is a unit test note!"
    response = client.post('/api/notes', 
                           data=json.dumps({"content": note_content}),
                           content_type='application/json')
    assert response.status_code == 201
    
    post_data = json.loads(response.data)
    assert post_data['status'] == 'success'
    note = post_data['data']
    assert note['content'] == note_content
    assert 'id' in note
    note_id = note['id']

    # 3. Check notes list again, should contain 1 note
    response = client.get('/api/notes')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['data']) == 1
    assert data['data'][0]['id'] == note_id
    assert data['data'][0]['content'] == note_content

    # 4. Attempt to add empty note, should return 400
    response = client.post('/api/notes', 
                           data=json.dumps({"content": "   "}),
                           content_type='application/json')
    assert response.status_code == 400

    # 5. Delete the note
    response = client.delete(f'/api/notes/{note_id}')
    assert response.status_code == 200
    delete_data = json.loads(response.data)
    assert delete_data['status'] == 'success'

    # 6. Check notes list, should be empty again
    response = client.get('/api/notes')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['data']) == 0

    # 7. Delete non-existent note, should return 404
    response = client.delete('/api/notes/999999')
    assert response.status_code == 404
