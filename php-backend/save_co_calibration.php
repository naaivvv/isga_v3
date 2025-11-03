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

$data = json_decode(file_get_contents("php://input"), true);

$gas_500 = isset($data['gas_500']) ? json_encode($data['gas_500']) : '[]';
$gas_100 = isset($data['gas_100']) ? json_encode($data['gas_100']) : '[]';
$gas_50 = isset($data['gas_50']) ? json_encode($data['gas_50']) : '[]';
$t_value = isset($data['t_value']) ? floatval($data['t_value']) : 0;
$passed = isset($data['passed']) ? intval($data['passed']) : 0;
$correction_slope = isset($data['correction_slope']) ? floatval($data['correction_slope']) : 1;
$correction_intercept = isset($data['correction_intercept']) ? floatval($data['correction_intercept']) : 0;

// Create table if not exists
$createTable = "CREATE TABLE IF NOT EXISTS co_calibration (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gas_500_readings TEXT,
    gas_100_readings TEXT,
    gas_50_readings TEXT,
    t_value FLOAT,
    passed TINYINT(1),
    correction_slope FLOAT,
    correction_intercept FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)";
$conn->query($createTable);

// Insert calibration data
$sql = "INSERT INTO co_calibration (gas_500_readings, gas_100_readings, gas_50_readings, t_value, passed, correction_slope, correction_intercept) 
        VALUES (?, ?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sssdidd", $gas_500, $gas_100, $gas_50, $t_value, $passed, $correction_slope, $correction_intercept);

if ($stmt->execute()) {
    echo json_encode([
        "success" => true, 
        "message" => "CO calibration saved successfully",
        "id" => $conn->insert_id
    ]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to save CO calibration"]);
}

$stmt->close();
$conn->close();
?>
