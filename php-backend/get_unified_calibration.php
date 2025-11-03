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

// Get calibration data for all gases
$sql = "SELECT * FROM calibration_v2";
$result = $conn->query($sql);

$calibration = [
    'CO' => null,
    'CO2' => null,
    'O2' => null
];

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $calibration[$row['gas_type']] = [
            'reference_value' => floatval($row['reference_value']),
            'trial_1_readings' => $row['trial_1_readings'] ? json_decode($row['trial_1_readings']) : [],
            'trial_2_readings' => $row['trial_2_readings'] ? json_decode($row['trial_2_readings']) : [],
            'trial_3_readings' => $row['trial_3_readings'] ? json_decode($row['trial_3_readings']) : [],
            'trial_1_avg' => floatval($row['trial_1_avg']),
            'trial_2_avg' => floatval($row['trial_2_avg']),
            'trial_3_avg' => floatval($row['trial_3_avg']),
            't_value' => $row['t_value'] !== null ? floatval($row['t_value']) : null,
            'passed' => intval($row['passed']),
            'correction_slope' => floatval($row['correction_slope']),
            'correction_intercept' => floatval($row['correction_intercept']),
            'updated_at' => $row['updated_at']
        ];
    }
}

echo json_encode($calibration);

$conn->close();
?>
