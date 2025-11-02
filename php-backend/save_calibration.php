<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit();
}

$servername = "localhost";
$dbname = "isga";
$username = "root";
$password = "";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed"]);
    exit();
}

// Get JSON data from request body
$data = json_decode(file_get_contents("php://input"), true);

$gas_type = isset($data['gas_type']) ? $data['gas_type'] : '';
$value = isset($data['value']) ? floatval($data['value']) : 0;

if (empty($gas_type)) {
    http_response_code(400);
    echo json_encode(["error" => "Gas type is required"]);
    exit();
}

// Insert or update calibration value
$sql = "INSERT INTO calibration (gas_type, calibrated_value) VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE calibrated_value = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sdd", $gas_type, $value, $value);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Calibration saved successfully"]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to save calibration"]);
}

$stmt->close();
$conn->close();
?>
