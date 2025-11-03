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

$gas_type = isset($data['gas_type']) ? $data['gas_type'] : '';
$reference_value = isset($data['reference_value']) ? floatval($data['reference_value']) : 0;
$trial_1_readings = isset($data['trial_1_readings']) ? json_encode($data['trial_1_readings']) : null;
$trial_2_readings = isset($data['trial_2_readings']) ? json_encode($data['trial_2_readings']) : null;
$trial_3_readings = isset($data['trial_3_readings']) ? json_encode($data['trial_3_readings']) : null;
$trial_1_avg = isset($data['trial_1_avg']) ? floatval($data['trial_1_avg']) : null;
$trial_2_avg = isset($data['trial_2_avg']) ? floatval($data['trial_2_avg']) : null;
$trial_3_avg = isset($data['trial_3_avg']) ? floatval($data['trial_3_avg']) : null;
$t_value = isset($data['t_value']) ? floatval($data['t_value']) : null;
$passed = isset($data['passed']) ? intval($data['passed']) : 0;
$correction_slope = isset($data['correction_slope']) ? floatval($data['correction_slope']) : 1;
$correction_intercept = isset($data['correction_intercept']) ? floatval($data['correction_intercept']) : 0;

if (empty($gas_type) || !in_array($gas_type, ['CO', 'CO2', 'O2'])) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid gas type"]);
    exit();
}

$sql = "INSERT INTO calibration_v2 (
    gas_type, reference_value, 
    trial_1_readings, trial_2_readings, trial_3_readings,
    trial_1_avg, trial_2_avg, trial_3_avg,
    t_value, passed, correction_slope, correction_intercept
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE 
    reference_value = ?,
    trial_1_readings = ?,
    trial_2_readings = ?,
    trial_3_readings = ?,
    trial_1_avg = ?,
    trial_2_avg = ?,
    trial_3_avg = ?,
    t_value = ?,
    passed = ?,
    correction_slope = ?,
    correction_intercept = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param(
    "sdsssddddiddsdssdddddd",
    $gas_type, $reference_value,
    $trial_1_readings, $trial_2_readings, $trial_3_readings,
    $trial_1_avg, $trial_2_avg, $trial_3_avg,
    $t_value, $passed, $correction_slope, $correction_intercept,
    // ON DUPLICATE KEY UPDATE values
    $reference_value,
    $trial_1_readings, $trial_2_readings, $trial_3_readings,
    $trial_1_avg, $trial_2_avg, $trial_3_avg,
    $t_value, $passed, $correction_slope, $correction_intercept
);

if ($stmt->execute()) {
    echo json_encode([
        "success" => true, 
        "message" => "Calibration saved successfully",
        "gas_type" => $gas_type,
        "passed" => $passed === 1
    ]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to save calibration: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
