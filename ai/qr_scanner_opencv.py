import cv2
import json
import os

class QRScanner:
    def __init__(self, employees_file="employee_data/employees.json"):
        self.employees_file = employees_file
        self.employee_db    = self._load_employees()
        self.qr_detector    = cv2.QRCodeDetector()

        self.current_employee = None
        self.scan_confirmed   = False

        print(f"[QRScanner] Loaded {len(self.employee_db)} employees from database")
        print("[QRScanner] Using OpenCV QR detector (no pyzbar)")

    def _load_employees(self):
        if not os.path.exists(self.employees_file):
            print(f"[QRScanner] WARNING: {self.employees_file} not found")
            return {}

        with open(self.employees_file, "r") as f:
            data = json.load(f)

        return {emp["id"]: emp for emp in data["employees"]}

    def scan_frame(self, frame):
        data, bbox, _ = self.qr_detector.detectAndDecode(frame)
        
        if data:
            raw_data = data.strip()
            print(f"[QRScanner] QR Detected: {raw_data}")

            if raw_data in self.employee_db:
                employee = self.employee_db[raw_data]
                self.current_employee = employee
                self.scan_confirmed   = True
                print(f"[QRScanner] Employee Identified: {employee['id']} — {employee['name']}")
                return employee
            else:
                print(f"[QRScanner] Unknown QR code: {raw_data}")
                return None

        return None

    def draw_qr_overlay(self, frame, detected_employee):
        data, bbox, _ = self.qr_detector.detectAndDecode(frame)
        
        if bbox is not None:
            bbox = bbox.astype(int)
            cv2.polylines(frame, [bbox], True, (0, 255, 0), 3)

            if detected_employee:
                x, y = bbox[0][0]
                cv2.putText(
                    frame,
                    f"{detected_employee['id']} — {detected_employee['name']}",
                    (x, y - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7, (0, 255, 0), 2
                )

        return frame

    def reset(self):
        self.current_employee = None
        self.scan_confirmed   = False
