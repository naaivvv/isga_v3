<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit();
}

$servername = "localhost";
$dbname = "isga"; // Your database name
$username = "root";
$password = "";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

// Check if data is coming from the ESP32 POST request
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    
    // Read data from $_POST
    $node_name = isset($_POST['node_name']) ? $_POST['node_name'] : "node_unknown";
    $co_ppm = isset($_POST['co']) ? floatval($_POST['co']) : 0;     // CO is received in PPM
    $co2_ppm = isset($_POST['co2']) ? floatval($_POST['co2']) : 0;   // CO2 is received in PPM
    $o2 = isset($_POST['o2']) ? floatval($_POST['o2']) : 0;
    $fan = isset($_POST['fan']) ? intval($_POST['fan']) : 0;
    $compressor = isset($_POST['compressor']) ? intval($_POST['compressor']) : 0;

    // --- Data Processing and Conversion ---
    
    // Convert CO2 from PPM (parts per million) to Percentage (%)
    // Formula: % = PPM / 10000
    // Example: 400 ppm is 0.04%
    $co2_percent = $co2_ppm / 10000;
    
    // Prepare and execute the INSERT statement
    // CO is saved as PPM ($co_ppm)
    // CO2 is saved as Percentage ($co2_percent)
    $sql = "INSERT INTO sensor (node_name, co, co2, o2, fan, compressor) VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    
    if ($stmt === false) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to prepare statement: " . $conn->error]);
        $conn->close();
        exit();
    }
    
    // Bind parameters:
    // $node_name (string)
    // $co_ppm (double) - Storing CO as PPM
    // $co2_percent (double) - Storing CO2 as percentage
    // $o2 (double)
    // $fan (integer)
    // $compressor (integer)
    $stmt->bind_param("sdddii", $node_name, $co_ppm, $co2_percent, $o2, $fan, $compressor);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Sensor data saved"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to save sensor data: " . $stmt->error]);
    }

    $stmt->close();
} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["error" => "Only POST requests are accepted"]);
}

$conn->close();
?>