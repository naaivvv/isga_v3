<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Content-Type: application/json");

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

// Get all calibration values
$sql = "SELECT gas_type, calibrated_value, updated_at FROM calibration";
$result = $conn->query($sql);

$calibration = [];
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $calibration[$row['gas_type']] = [
            'value' => floatval($row['calibrated_value']),
            'updated_at' => $row['updated_at']
        ];
    }
}

echo json_encode($calibration);

$conn->close();
?>
