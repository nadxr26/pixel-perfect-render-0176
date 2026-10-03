CREATE TABLE public.venues (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  area text NOT NULL,
  sports text[] NOT NULL DEFAULT '{}',
  kind text NOT NULL CHECK (kind IN ('public','private')),
  access text NOT NULL DEFAULT 'paid' CHECK (access IN ('free','verify','paid')),
  bookable boolean NOT NULL DEFAULT false,
  phone text,
  price_per_hour integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.venues TO anon, authenticated;
GRANT ALL ON public.venues TO service_role;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active venues" ON public.venues FOR SELECT TO anon, authenticated USING (active);

INSERT INTO public.venues (id,name,area,sports,kind,access,bookable,phone,price_per_hour,active) VALUES
 ('g1','Sawai Mansingh Stadium (SMS Stadium)','C-Scheme','{Cricket,Football,Athletics}','private','paid',true,NULL,2500,true),
 ('g2','Rajasthan University Sports Complex','JLN Marg','{Football,Cricket,Badminton}','public','verify',false,NULL,NULL,false),
 ('g3','University Maharaja College Ground','JLN Marg','{Football,Cricket,Athletics}','public','verify',false,NULL,NULL,false),
 ('g4','Dolphin Sports Academy','Mansarovar','{Football,Cricket,Badminton}','private','paid',true,NULL,1000,true),
 ('g5','The Football Park','Tonk Road','{Football}','private','paid',true,NULL,1200,true),
 ('g6','Jaipur Sports Academy','Jagatpura','{Football,Cricket,Badminton}','private','paid',true,NULL,900,true),
 ('g7','Fitso Sports Arena','Vaishali Nagar','{Badminton,"Table Tennis",Football}','private','paid',true,NULL,600,true),
 ('g8','PlayAll Sports Arena','Mansarovar','{Football,Cricket,Basketball}','private','paid',true,NULL,1100,true),
 ('g9','Sportify Arena','Tonk Road','{Football,Cricket,Volleyball}','private','paid',true,NULL,1300,true),
 ('g10','Local Box Turfs','Vaishali Nagar','{Football,Cricket}','private','paid',true,NULL,600,true),
 ('v1','Sanganer Stadium','Sanganer / Pratap Nagar','{Multi-sport}','public','free',false,NULL,NULL,true),
 ('v2','SMS Football Ground','Lalkothi','{Football}','public','free',false,NULL,NULL,true),
 ('v3','Basketball Academy Court — SMS area','Lalkothi','{Basketball}','public','free',false,NULL,NULL,true),
 ('v4','R.K Cricket Turf & Football Ground','Mansarovar','{Cricket,Football}','private','paid',true,'8005825603',NULL,true),
 ('v5','Jaipur Royals Turf','Mansarovar','{Cricket,Football}','private','paid',true,'8209970976',NULL,true),
 ('v6','Dugout Turf Arena','Keshupura','{"Box Cricket"}','private','paid',true,'8000986401',NULL,true),
 ('v7','Superplay Turf','Narayan Vihar','{Cricket,Football}','private','paid',true,'6350354623',NULL,true),
 ('v8','Sports Villa','Nirman Nagar','{Cricket,Football,Multi-sport}','private','paid',true,'9549113456',NULL,true),
 ('v9','Turbo Turf','Adarsh Nagar','{Multi-sport}','private','paid',true,'9119116744',NULL,true),
 ('v10','SUPER OVER TURF','Sodala','{Cricket,"Turf Sports"}','private','paid',true,'7976976619',NULL,true),
 ('v11','Turf Zone','Jhotwara','{"Turf Sports"}','private','paid',true,'8107635588',NULL,true),
 ('v12','Turf 8teen10','C-Scheme / Sahkar Marg','{Pickleball,Multi-sport}','private','paid',true,'8696923748',NULL,true),
 ('v13','The Carnation Cricket Turf','Mansarovar','{Cricket}','private','paid',true,'9057232079',NULL,true),
 ('v14','Speed Turf','Vaishali Nagar','{"Turf Sports"}','private','paid',true,'6376871540',NULL,true),
 ('v15','Shri Dadu Dayal Sports Arena','Mansarovar','{Cricket}','private','paid',true,'9414039993',NULL,true),
 ('v16','Matrix Turf 2.0','Niwaru Road','{Cricket,Football,Pickleball}','private','paid',true,'9119126859',NULL,true),
 ('v17','2 Win Turf & Cricket Bowling Machine','Ajmer Road','{Cricket}','private','paid',true,'6350333801',NULL,true),
 ('v18','Aerial Sports Hub','Murlipura','{Badminton}','private','paid',true,'9773386444',NULL,true),
 ('v19','Aerial Multi Sports Hub','Vidyadhar Nagar','{Badminton,Swimming}','private','paid',true,'7426008890',NULL,true),
 ('v20','Shiva Sports Club','Murlipura','{Basketball,"Box Cricket",Football,Pickleball}','private','paid',true,'7426008890',NULL,true);