import json
from services.estimator import calculate_estimate

test_params = {
    "customerName": "Ravi Sharma",
    "location": "Bangalore",
    "buildingType": "Residential Villa",
    "totalSqft": 2000,
    "floors": 2,
    "bedrooms": 4,
    "bathrooms": 3,
    "quality": "Premium",
    "cementBrand": "UltraTech",
    "steelGrade": "Fe550D",
    "brickType": "AAC Blocks",
    "sandType": "M-Sand",
    "flooringType": "Granite Flooring",
    "paintType": "Premium Emulsion",
    "modularKitchen": True,
    "wardrobes": 3,
    "falseCeiling": True,
    "tvUnit": True,
    "interiorQuality": "Premium"
}

try:
    print("--- STARTING ESTIMATOR PIPELINE TEST ---")
    res = calculate_estimate(test_params)
    
    print("\n1. Calculation Summary:")
    print(f"   Grand Total: Rs. {res['costs']['grandTotal']:,}")
    print(f"   Subtotal:    Rs. {res['costs']['subtotal']:,}")
    print(f"   GST ({res['costs']['gstPct']}%):  Rs. {res['costs']['gst']:,}")
    print(f"   Timeline:    {res['duration']['min']} to {res['duration']['max']} months")
    
    print("\n2. Quantities Computed:")
    for k, v in res['quantities'].items():
        print(f"   {k}: {v}")
        
    print("\n3. Gemini AI Recommendations:")
    print(json.dumps(res['recommendations'], indent=2))
    
    print("\n--- TEST COMPLETED SUCCESSFULLY ---")
except Exception as e:
    print("\nFAILED: test execution failed with error:", str(e))
