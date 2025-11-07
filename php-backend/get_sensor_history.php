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

// Get the last 20 sensor readings ordered by created_at
$sql = "SELECT co, co2, o2, created_at as timestamp FROM sensor ORDER BY created_at DESC LIMIT 20";
$result = $conn->query($sql);

$data = [];
if ($result && $result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
} else if (!$result) {
    // Return empty array if table doesn't exist or query fails
    echo json_encode([]);
    $conn->close();
    exit();
}

// Reverse array so oldest is first (for chronological order in charts)
$data = array_reverse($data);

echo json_encode($data);

$conn->close();
?>
