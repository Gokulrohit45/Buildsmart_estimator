// =====================================================================
// BuildSmart AI Estimator — Indian States & Districts Data Master
// =====================================================================

export const INDIA_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi (UT)",
  "Jammu & Kashmir (UT)",
  "Puducherry (UT)",
  "Chandigarh (UT)"
].sort();

export const STATE_DISTRICTS = {
  "Andhra Pradesh": [
    "Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", 
    "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", 
    "West Godavari", "YSR Kadapa", "Vijayawada", "Kakinada", "Tirupati", "Eluru"
  ].sort(),
  "Arunachal Pradesh": [
    "Tawang", "West Kameng", "East Kameng", "Papum Pare", "Kurung Kumey", 
    "Kra Daadi", "Lower Subansiri", "Upper Subansiri", "West Siang", 
    "East Siang", "Siang", "Upper Siang", "Lower Siang", "Lower Dibang Valley", 
    "Dibang Valley", "Anjaw", "Lohit", "Namsai", "Changlang", "Tirap", "Longding", "Itanagar"
  ].sort(),
  "Assam": [
    "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", 
    "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", 
    "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", 
    "Kamrup Metropolitan (Guwahati)", "Karbi Anglong", "Karimganj", "Kokrajhar", 
    "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", 
    "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"
  ].sort(),
  "Bihar": [
    "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", 
    "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", 
    "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", 
    "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda (Bihar Sharif)", "Nawada", 
    "Patna", "Purnia", "Rohtas (Sasaram)", "Saharsa", "Samastipur", "Saran (Chhapra)", 
    "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali (Hajipur)", "West Champaran"
  ].sort(),
  "Chhattisgarh": [
    "Balod", "Baloda Bazar", "Balrampur", "Bastar (Jagdalpur)", "Bemetara", "Bijapur", 
    "Bilaspur", "Dantewada", "Dhamtari", "Durg (Bhilai)", "Gariaband", "Janjgir-Champa", 
    "Jashpur", "Kabirdham (Kawardha)", "Kanker", "Kondagaon", "Korba", "Koriya", 
    "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", 
    "Sukma", "Surajpur", "Surguja (Ambikapur)"
  ].sort(),
  "Goa": [
    "North Goa (Panaji)", "South Goa (Margao)", "Vasco da Gama", "Mapusa", "Ponda"
  ].sort(),
  "Gujarat": [
    "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha (Palanpur)", "Bharuch", 
    "Bhavnagar", "Botad", "Chhota Udepur", "Dahod", "Dang", "Devbhumi Dwarka", 
    "Gandhinagar", "Gir Somnath (Veraval)", "Jamnagar", "Junagadh", "Kheda (Nadiad)", 
    "Kutch (Bhuj)", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", 
    "Panchmahal (Godhra)", "Patan", "Porbandar", "Rajkot", "Sabarkantha", 
    "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"
  ].sort(),
  "Haryana": [
    "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram (Gurgaon)", 
    "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", 
    "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", 
    "Sonipat", "Yamunanagar"
  ].sort(),
  "Himachal Pradesh": [
    "Bilaspur", "Chamba", "Hamirpur", "Kangra (Dharamshala)", "Kinnaur", "Kullu", 
    "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"
  ].sort(),
  "Jharkhand": [
    "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum (Jamshedpur)", 
    "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", 
    "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu (Medininagar)", "Ramgarh", 
    "Ranchi", "Sahibganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum"
  ].sort(),
  "Karnataka": [
    "Bangalore", "Bangalore Rural", "Bagalkot", "Belgaum", "Bellary", "Bidar", "Bijapur", 
    "Chamarajanagar", "Chikkaballapur", "Chikmagalur", "Chitradurga", "Dakshina Kannada (Mangalore)", 
    "Davanagere", "Dharwad (Hubli)", "Gadag", "Gulbarga", "Hassan", "Haveri", "Kodagu", 
    "Kolar", "Koppal", "Mandya", "Mysore", "Raichur", "Ramanagara", "Shimoga", "Tumkur", 
    "Udupi", "Uttara Kannada", "Yadgir"
  ].sort(),
  "Kerala": [
    "Alappuzha", "Ernakulam (Kochi)", "Idukki", "Kannur", "Kasaragod", "Kollam", 
    "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", 
    "Thiruvananthapuram", "Thrissur", "Wayanad"
  ].sort(),
  "Madhya Pradesh": [
    "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", 
    "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", 
    "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", 
    "Harding", "Hoshangabad", "Indore", "Jabalpur", "Jagatsinghpur", "Jhabua", 
    "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", 
    "Neemuch", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", 
    "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", 
    "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Vidhisha"
  ].sort(),
  "Maharashtra": [
    "Mumbai", "Mumbai Suburban", "Thane", "Pune", "Nagpur", "Nashik", "Aurangabad", 
    "Solapur", "Amravati", "Nanded", "Kolhapur", "Sangli", "Jalgaon", "Akola", 
    "Latur", "Ahmednagar", "Dhule", "Chandrapur", "Parbhani", "Jalna", 
    "Bhiwandi", "Panvel", "Satara", "Beed", "Yavatmal", "Gondia", "Wardha", 
    "Bhandara", "Gadchiroli", "Hingoli", "Nandurbar", "Osmanabad", "Ratnagiri", 
    "Sindhudurg", "Washim"
  ].sort(),
  "Manipur": [
    "Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", 
    "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", 
    "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"
  ].sort(),
  "Meghalaya": [
    "East Garo Hills", "East Jaintia Hills", "East Khasi Hills (Shillong)", 
    "North Garo Hills", "Ribhoi", "South Garo Hills", "South West Garo Hills", 
    "South West Khasi Hills", "West Garo Hills (Tura)", "West Jaintia Hills", "West Khasi Hills"
  ].sort(),
  "Mizoram": [
    "Aizawl", "Champhai", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Serchhip"
  ].sort(),
  "Nagaland": [
    "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Peren", 
    "Phek", "Tuensang", "Wokha", "Zunheboto"
  ].sort(),
  "Odisha": [
    "Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", 
    "Deogarh", "Dhenkanal", "Gajapati", "Ganjam (Berhampur)", "Jagatsinghpur", 
    "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", 
    "Kendujhar (Keonjhar)", "Khurda (Bhubaneswar)", "Koraput", "Malkangiri", 
    "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", 
    "Sambalpur", "Subarnapur", "Sundargarh (Rourkela)"
  ].sort(),
  "Punjab": [
    "Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", 
    "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", 
    "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", 
    "Sahibzada Ajit Singh Nagar (Mohali)", "Sangrur", "Shahid Bhagat Singh Nagar", 
    "Tarn Taran"
  ].sort(),
  "Rajasthan": [
    "Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", 
    "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", 
    "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", 
    "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", 
    "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", 
    "Tonk", "Udaipur"
  ].sort(),
  "Sikkim": [
    "East Sikkim (Gangtok)", "North Sikkim", "South Sikkim", "West Sikkim"
  ].sort(),
  "Tamil Nadu": [
    "Coimbatore", "Chennai", "Madurai", "Trichy", "Salem", "Tiruppur", "Erode", 
    "Vellore", "Thoothukudi", "Tirunelveli", "Nagercoil (Kanyakumari)", "Thanjavur", 
    "Dindigul", "Cuddalore", "Kanchipuram", "Tiruvannamalai", "Hosur", "Pudukkottai", 
    "Dharmapuri", "Karur", "Krishnagiri", "Namakkal", "Nagapattinam", "Perambalur", 
    "Ramanathapuram", "Sivaganga", "Tenkasi", "Theni", "Thiruvallur", "Nilgiris (Ooty)", 
    "Ranipet", "Tirupattur", "Kallakurichi", "Chengalpattu", "Viluppuram", "Virudhunagar", 
    "Ariyalur", "Tiruvarur"
  ].sort(),
  "Telangana": [
    "Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", 
    "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", 
    "Khammam", "Komaram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", 
    "Mancherial", "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", 
    "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", 
    "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", 
    "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"
  ].sort(),
  "Tripura": [
    "Dhalai", "Gomati", "Khowai", "North Tripura (Dharmanagar)", "Sepahijala", 
    "South Tripura", "Unakoti", "West Tripura (Agartala)"
  ].sort(),
  "Uttar Pradesh": [
    "Agra", "Aligarh", "Allahabad (Prayagraj)", "Ambedkar Nagar", "Amethi", 
    "Amroha", "Auraiya", "Ayodhya (Faizabad)", "Azamgarh", "Baghpat", "Bahraich", 
    "Ballia", "Balrampur", "Banda", "Bara Banki", "Bareilly", "Basti", 
    "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", 
    "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar (Noida)", 
    "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", 
    "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", 
    "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri (Lakhimpur)", "Kushinagar", 
    "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", 
    "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", 
    "Pratapgarh", "Rae Bareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", 
    "Bhadohi", "Shahjahanpur", "Shamli", "Shrawasti", "Siddharthnagar", 
    "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"
  ].sort(),
  "Uttarakhand": [
    "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", 
    "Nainital (Haldwani)", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", 
    "Tehri Garhwal", "Udham Singh Nagar (Rudrapur)", "Uttarkashi"
  ].sort(),
  "West Bengal": [
    "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", 
    "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", 
    "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", 
    "Paschim Bardhaman (Asansol)", "Paschim Medinipur", "Purba Bardhaman", 
    "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"
  ].sort(),
  "Delhi (UT)": [
    "Delhi", "New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi",
    "Central Delhi", "North East Delhi", "North West Delhi", "South East Delhi", "South West Delhi"
  ].sort(),
  "Jammu & Kashmir (UT)": [
    "Srinagar", "Jammu", "Anantnag", "Baramulla", "Kathua", "Sopore", "Udhampur", 
    "Budgam", "Kupwara", "Pulwama", "Samba", "Poonch", "Rajouri", "Ramban"
  ].sort(),
  "Puducherry (UT)": [
    "Puducherry", "Karaikal", "Mahe", "Yanam"
  ].sort(),
  "Chandigarh (UT)": [
    "Chandigarh"
  ]
};
