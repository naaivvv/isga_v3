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

// Get the latest sensor reading
$sql = "SELECT * FROM sensor ORDER BY created_at DESC LIMIT 1";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    echo json_encode($row);
} else {
    echo json_encode([
        "id" => null,
        "node_name" => "node111",
        "co" => 0,
        "co2" => 0,
        "o2" => 0,
        "fan" => 0,
        "compressor" => 0,
        "created_at" => null,
        "updated_at" => null
    ]);
}

$conn->close();
?>
