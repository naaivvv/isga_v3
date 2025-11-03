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

$hours = isset($data['hours']) ? intval($data['hours']) : 0;
$minutes = isset($data['minutes']) ? intval($data['minutes']) : 0;
$active = isset($data['active']) ? intval($data['active']) : 0;

// Update the schedule (always update the first/only row)
// Set updated_at to NOW() when schedule is modified
$sql = "UPDATE schedule SET hours = ?, minutes = ?, active = ?, updated_at = NOW() WHERE id = 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("iii", $hours, $minutes, $active);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Schedule updated successfully"]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to update schedule"]);
}

$stmt->close();
$conn->close();
?>
