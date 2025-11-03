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

// Get the latest CO calibration
$sql = "SELECT * FROM co_calibration ORDER BY created_at DESC LIMIT 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $row['gas_500_readings'] = json_decode($row['gas_500_readings'], true);
    $row['gas_100_readings'] = json_decode($row['gas_100_readings'], true);
    $row['gas_50_readings'] = json_decode($row['gas_50_readings'], true);
    echo json_encode($row);
} else {
    echo json_encode([
        "id" => null,
        "gas_500_readings" => [],
        "gas_100_readings" => [],
        "gas_50_readings" => [],
        "t_value" => null,
        "passed" => null,
        "correction_slope" => 1,
        "correction_intercept" => 0,
        "created_at" => null
    ]);
}

$conn->close();
?>
