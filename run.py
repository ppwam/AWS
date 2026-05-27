import os
import sys

# Ensure the workspace directory is in the python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from src.app import app

if __name__ == '__main__':
    # Run the Flask app on port 19191, listening on all interfaces
    # Debug mode is enabled for development convenience
    app.run(host='0.0.0.0', port=19191, debug=True)
