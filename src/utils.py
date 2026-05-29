import os
import json
import time
import platform
from datetime import datetime

# Optional import of psutil with robust fallback to mock data
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

class SystemStats:
    """Helper class to retrieve system performance and info metrics."""
    
    simulated_cpu_spike = False
    simulated_users = 0
    
    @staticmethod
    def get_uptime():
        """Retrieve system uptime."""
        if HAS_PSUTIL:
            try:
                boot_time = psutil.boot_time()
                uptime_seconds = time.time() - boot_time
                return SystemStats._format_seconds(uptime_seconds)
            except Exception:
                pass
        
        # Fallback uptime calculation using internal process start time
        process_uptime = time.time() - getattr(SystemStats, '_start_time', time.time())
        return SystemStats._format_seconds(process_uptime)

    @staticmethod
    def _format_seconds(seconds):
        """Helper to format seconds into a clean uptime string."""
        days, rem = divmod(seconds, 86400)
        hours, rem = divmod(rem, 3600)
        minutes, seconds = divmod(rem, 60)
        
        parts = []
        if days > 0:
            parts.append(f"{int(days)}d")
        if hours > 0:
            parts.append(f"{int(hours)}h")
        if minutes > 0:
            parts.append(f"{int(minutes)}m")
        parts.append(f"{int(seconds)}s")
        return " ".join(parts)

    @staticmethod
    def get_stats():
        """Fetch all system resource statistics."""
        stats = {
            "os_name": f"{platform.system()} {platform.release()}",
            "python_version": platform.python_version(),
            "uptime": SystemStats.get_uptime(),
            "cpu": {
                "percent": 0.0,
                "cores": 1
            },
            "memory": {
                "total_gb": 8.0,
                "used_gb": 4.0,
                "free_gb": 4.0,
                "percent": 50.0
            },
            "disk": {
                "total_gb": 100.0,
                "used_gb": 50.0,
                "free_gb": 50.0,
                "percent": 50.0
            },
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        if HAS_PSUTIL:
            try:
                # CPU Stats
                stats["cpu"]["percent"] = psutil.cpu_percent(interval=None)
                stats["cpu"]["cores"] = psutil.cpu_count(logical=True)
                
                # Memory Stats
                mem = psutil.virtual_memory()
                stats["memory"]["total_gb"] = round(mem.total / (1024 ** 3), 2)
                stats["memory"]["used_gb"] = round(mem.used / (1024 ** 3), 2)
                stats["memory"]["free_gb"] = round(mem.available / (1024 ** 3), 2)
                stats["memory"]["percent"] = mem.percent
                
                # Disk Stats
                disk = psutil.disk_usage('/')
                stats["disk"]["total_gb"] = round(disk.total / (1024 ** 3), 2)
                stats["disk"]["used_gb"] = round(disk.used / (1024 ** 3), 2)
                stats["disk"]["free_gb"] = round(disk.free / (1024 ** 3), 2)
                stats["disk"]["percent"] = disk.percent
            except Exception as e:
                # If psutil reading fails, logs error silently or leaves mock values
                pass
        else:
            # Generate fluctuating realistic mock data for nice UI representation if psutil is not available
            # This ensures the dashboard still looks amazing and dynamic
            import random
            stats["cpu"]["percent"] = round(random.uniform(5.0, 25.0), 1)
            stats["cpu"]["cores"] = 4
            
            # Static mock memory & disk
            stats["memory"]["percent"] = round(45.0 + random.uniform(-2.0, 2.0), 1)
            stats["memory"]["used_gb"] = round((stats["memory"]["total_gb"] * stats["memory"]["percent"]) / 100.0, 2)
            stats["memory"]["free_gb"] = round(stats["memory"]["total_gb"] - stats["memory"]["used_gb"], 2)
            
            stats["disk"]["percent"] = 62.4
            stats["disk"]["used_gb"] = round((stats["disk"]["total_gb"] * stats["disk"]["percent"]) / 100.0, 2)
            stats["disk"]["free_gb"] = round(stats["disk"]["total_gb"] - stats["disk"]["used_gb"], 2)

        if SystemStats.simulated_cpu_spike:
            import random
            stats["cpu"]["percent"] = min(100.0, round(94.0 + random.uniform(-2.0, 4.0), 1))
            stats["memory"]["percent"] = min(99.0, round(stats["memory"]["percent"] * 1.6, 1))
            stats["memory"]["used_gb"] = round((stats["memory"]["total_gb"] * stats["memory"]["percent"]) / 100.0, 2)
            stats["memory"]["free_gb"] = round(stats["memory"]["total_gb"] - stats["memory"]["used_gb"], 2)

        return stats

# Record the module start time for uptime fallback
SystemStats._start_time = time.time()


class NoteManager:
    """Handles persistence of notes/tasks for the Workspace Hub in a JSON file."""
    
    def __init__(self, filepath=None):
        if filepath is None:
            # Store in 'data' directory at the project root
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_dir = os.path.join(base_dir, 'data')
            os.makedirs(data_dir, exist_ok=True)
            self.filepath = os.path.join(data_dir, 'notes.json')
        else:
            self.filepath = filepath
            
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        """Creates the JSON file with empty array if it doesn't exist."""
        if not os.path.exists(self.filepath):
            self.save_notes([])

    def load_notes(self):
        """Reads notes from the JSON file."""
        try:
            with open(self.filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

    def save_notes(self, notes):
        """Writes notes to the JSON file."""
        try:
            with open(self.filepath, 'w', encoding='utf-8') as f:
                json.dump(notes, f, indent=4, ensure_ascii=False)
            return True
        except Exception:
            return False

    def add_note(self, content):
        """Adds a new note and returns the created note object."""
        notes = self.load_notes()
        new_note = {
            "id": int(time.time() * 1000),  # Unique millisecond timestamp id
            "content": content,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M")
        }
        notes.append(new_note)
        self.save_notes(notes)
        return new_note

    def delete_note(self, note_id):
        """Deletes a note by its unique ID."""
        notes = self.load_notes()
        filtered_notes = [n for n in notes if n["id"] != int(note_id)]
        self.save_notes(filtered_notes)
        return len(notes) != len(filtered_notes)


class StockManager:
    """Provides real-time mock data for Taiwanese Stocks hitting their daily +10% limit up."""
    
    @staticmethod
    def get_limit_up_stocks():
        import random
        # Seed stocks that hit limit-up (+10%) today
        base_stocks = [
            {"code": "1519", "name": "華城", "price": 920.0, "change_value": 83.0, "volume": 12450, "industry": "重電觀念股"},
            {"code": "2382", "name": "廣達", "price": 286.0, "change_value": 26.0, "volume": 48210, "industry": "AI伺服器"},
            {"code": "3231", "name": "緯創", "price": 121.0, "change_value": 11.0, "volume": 72450, "industry": "AI伺服器"},
            {"code": "3037", "name": "欣興", "price": 187.0, "change_value": 17.0, "volume": 28940, "industry": "IC載板"},
            {"code": "2603", "name": "長榮", "price": 214.5, "change_value": 19.5, "volume": 35120, "industry": "航運業"},
            {"code": "3661", "name": "世芯-KY", "price": 3135.0, "change_value": 285.0, "volume": 1820, "industry": "矽智財 (IP)"}
        ]
        
        # Add slight fluctuations to the trading volume to make the page dynamic on reload
        for stock in base_stocks:
            stock["volume"] = int(stock["volume"] * random.uniform(0.95, 1.05))
            stock["change_percent"] = 10.0
            
        return base_stocks


class CompanyScheduleManager:
    """Manages workspace afternoon schedule and occupancy data for various companies."""
    
    @staticmethod
    def get_afternoon_companies():
        # Occupancy schedules for prominent companies in the afternoon
        return [
            {
                "id": "tsmc",
                "name": "台積電 (TSMC)",
                "hours": "13:00 - 18:30 (下午班)",
                "mode": "現場辦公 (Flex)",
                "attendance_rate": 94,
                "status": "下午班進行中",
                "location": "新竹科學園區"
            },
            {
                "id": "mediatek",
                "name": "聯發科 (MediaTek)",
                "hours": "13:00 - 18:00 (下午班)",
                "mode": "彈性混合辦公",
                "attendance_rate": 86,
                "status": "下午班進行中",
                "location": "新竹科學園區"
            },
            {
                "id": "google",
                "name": "Google 台灣 (Google Taiwan)",
                "hours": "13:00 - 18:00 (自由工時)",
                "mode": "混合辦公 (WFH 3天)",
                "attendance_rate": 62,
                "status": "彈性工時中",
                "location": "台北板橋 T-Park"
            },
            {
                "id": "asus",
                "name": "華碩電腦 (ASUS)",
                "hours": "13:30 - 18:00 (標準班)",
                "mode": "現場辦公",
                "attendance_rate": 89,
                "status": "下午班進行中",
                "location": "台北關渡總部"
            },
            {
                "id": "delta",
                "name": "台達電子 (Delta)",
                "hours": "13:00 - 18:00 (下午班)",
                "mode": "彈性工時 (週五遠端)",
                "attendance_rate": 88,
                "status": "下午班進行中",
                "location": "台北內湖總部"
            },
            {
                "id": "cht",
                "name": "中華電信 (CHT)",
                "hours": "13:30 - 17:30 (下午班)",
                "mode": "現場辦公",
                "attendance_rate": 96,
                "status": "下午班進行中",
                "location": "台北信義總部"
            }
        ]


class S3Manager:
    """Manages secure interactions with AWS S3 and provides local mock fallback."""
    
    BUCKET_NAME = "bucket-for-hoodini"
    
    @staticmethod
    def is_aws_configured():
        """Check if AWS credentials are set in the environment or config."""
        try:
            import boto3
            session = boto3.Session()
            creds = session.get_credentials()
            return creds is not None and creds.access_key is not None
        except Exception:
            return False

    @staticmethod
    def get_s3_client():
        """Initialize and return a boto3 S3 client."""
        import boto3
        # No hardcoded access key or secret key!
        # Automatically detects from environment variables or ~/.aws/credentials
        return boto3.client('s3', region_name=os.getenv('AWS_DEFAULT_REGION', 'ap-east-2'))

    @staticmethod
    def upload_file(file_obj, filename):
        """Upload a file to S3 or local mock directory."""
        # Reset file stream pointer to the beginning to ensure full readability
        try:
            file_obj.seek(0)
        except Exception:
            pass

        if S3Manager.is_aws_configured():
            try:
                s3 = S3Manager.get_s3_client()
                # Upload the underlying stream object to S3
                s3.upload_fileobj(file_obj.stream, S3Manager.BUCKET_NAME, filename)
                return {
                    "status": "success",
                    "mode": "s3",
                    "filename": filename,
                    "message": "File successfully uploaded to AWS S3!"
                }
            except Exception as e:
                return {
                    "status": "error",
                    "mode": "s3",
                    "message": f"AWS S3 Upload failed: {str(e)}"
                }
        else:
            # Local Simulated Mock Mode
            try:
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                mock_dir = os.path.join(base_dir, 'data', 's3_mock')
                os.makedirs(mock_dir, exist_ok=True)
                
                # Save file locally
                filepath = os.path.join(mock_dir, filename)
                file_obj.save(filepath)
                
                return {
                    "status": "success",
                    "mode": "simulated",
                    "filename": filename,
                    "message": "AWS credentials not detected. Saved in Simulated Mode locally."
                }
            except Exception as e:
                return {
                    "status": "error",
                    "mode": "simulated",
                    "message": f"Simulated local save failed: {str(e)}"
                }

    @staticmethod
    def list_files():
        """List files in the S3 bucket or local mock directory."""
        if S3Manager.is_aws_configured():
            try:
                s3 = S3Manager.get_s3_client()
                response = s3.list_objects_v2(Bucket=S3Manager.BUCKET_NAME)
                
                files = []
                if 'Contents' in response:
                    for obj in response['Contents']:
                        files.append({
                            "name": obj['Key'],
                            "size_bytes": obj['Size'],
                            "last_modified": obj['LastModified'].strftime("%Y-%m-%d %H:%M:%S")
                        })
                return {
                    "status": "success",
                    "mode": "s3",
                    "files": files
                }
            except Exception as e:
                return {
                    "status": "error",
                    "mode": "s3",
                    "message": f"Failed to list S3 bucket contents: {str(e)}",
                    "files": []
                }
        else:
            # Local Simulated Mock Mode
            try:
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                mock_dir = os.path.join(base_dir, 'data', 's3_mock')
                os.makedirs(mock_dir, exist_ok=True)
                
                files = []
                for entry in os.scandir(mock_dir):
                    if entry.is_file():
                        stat = entry.stat()
                        files.append({
                            "name": entry.name,
                            "size_bytes": stat.st_size,
                            "last_modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                        })
                
                # Sort descending by last modified
                files.sort(key=lambda x: x["last_modified"], reverse=True)
                return {
                    "status": "success",
                    "mode": "simulated",
                    "files": files
                }
            except Exception as e:
                return {
                    "status": "error",
                    "mode": "simulated",
                    "message": f"Failed to list local simulated files: {str(e)}",
                    "files": []
                }

    @staticmethod
    def delete_file(filename):
        """Delete a file from S3 or local mock directory."""
        if S3Manager.is_aws_configured():
            try:
                s3 = S3Manager.get_s3_client()
                s3.delete_object(Bucket=S3Manager.BUCKET_NAME, Key=filename)
                return {
                    "status": "success",
                    "mode": "s3",
                    "message": "File successfully deleted from AWS S3!"
                }
            except Exception as e:
                return {
                    "status": "error",
                    "mode": "s3",
                    "message": f"AWS S3 delete failed: {str(e)}"
                }
        else:
            # Local Simulated Mock Mode
            try:
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                mock_dir = os.path.join(base_dir, 'data', 's3_mock')
                filepath = os.path.join(mock_dir, filename)
                
                if os.path.exists(filepath):
                    os.remove(filepath)
                    return {
                        "status": "success",
                        "mode": "simulated",
                        "message": "File successfully deleted from local simulated storage!"
                    }
                else:
                    return {
                        "status": "error",
                        "mode": "simulated",
                        "message": "File not found in simulated storage."
                    }
            except Exception as e:
                return {
                    "status": "error",
                    "mode": "simulated",
                    "message": f"Simulated delete failed: {str(e)}"
                }


import threading

class CPUStressThread(threading.Thread):
    def __init__(self, duration=30):
        super().__init__()
        self.duration = duration
        self.stop_event = threading.Event()

    def run(self):
        import time
        start_time = time.time()
        while time.time() - start_time < self.duration and not self.stop_event.is_set():
            for _ in range(50000):
                _ = 42 * 42
            time.sleep(0.001)

class StressManager:
    active_threads = []
    
    @staticmethod
    def start_stress(duration=30, threads_count=4):
        StressManager.stop_stress()
        for _ in range(threads_count):
            t = CPUStressThread(duration=duration)
            t.daemon = True
            t.start()
            StressManager.active_threads.append(t)
            
    @staticmethod
    def stop_stress():
        for t in StressManager.active_threads:
            t.stop_event.set()
        StressManager.active_threads.clear()


