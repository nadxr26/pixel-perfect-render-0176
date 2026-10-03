-- Replace venue data with the exact, verified paid/bookable list supplied by the project owner.
-- Removes: leftover sample grounds (universities, SMS Stadium, demo academies) and several
-- invented turfs that were never part of the verified list.
-- No FREE GOVERNMENT / PUBLIC GROUND rows are added: public sources could not reliably confirm
-- any specific Jaipur government ground as walk-in-without-permission, so none are listed rather
-- than guessed. Add real ones (name, sports, exact location) once confirmed.
TRUNCATE public.venues;

INSERT INTO public.venues (id,name,area,sports,kind,access,bookable,phone,price_per_hour,active) VALUES
 ('v1','Matrix Turf','Jagatpura','{Cricket,Football}','private','paid',true,'9461877677',NULL,true),
 ('v2','SNJ Sports Arena','Jagatpura','{Cricket,Football}','private','paid',true,'7742598229',NULL,true),
 ('v3','8teen10','Sahkar Marg','{Cricket,Football}','private','paid',true,'8696923748',NULL,true),
 ('v4','Jaipur Royals Turf','Mansarovar','{"Box Cricket"}','private','paid',true,'8209970976',NULL,true),
 ('v5','Dugout Turf Arena','Kamala Nehru Nagar','{"Box Cricket"}','private','paid',true,'8000986401',NULL,true),
 ('v6','The Town Cricket Turf','Jagatpura','{"Box Cricket"}','private','paid',true,'7297892054',NULL,true),
 ('v7','R.K Cricket Turf & Football Ground','Manyawas, Mansarovar','{Cricket,Football}','private','paid',true,'8005825603',NULL,true),
 ('v8','RACKONNECT Royal Badminton Arena','Jagatpura','{Badminton}','private','paid',true,'8447938928',NULL,true),
 ('v9','AIM Badminton Academy','Hawa Sadak','{Badminton}','private','paid',true,'8003763609',NULL,true),
 ('v10','Aerial Sports Hub','Murlipura','{Badminton}','private','paid',true,'9773386444',NULL,true),
 ('v11','Aerial Multi Sports Hub','Vidyadhar Nagar','{Badminton}','private','paid',true,'7426008890',NULL,true),
 ('v12','Jaipur Pickleball by 8teen10','Sahkar Marg','{Pickleball}','private','paid',true,'9549523748',NULL,true),
 ('v13','Skydeck Pickleball','Mansarovar','{Pickleball}','private','paid',true,'7851878536',NULL,true),
 ('v14','Pickleball Reserve','Durgapura','{Pickleball}','private','paid',true,'8529522219',NULL,true),
 ('v15','The Court Jaipur Pickleball','Vaishali Nagar','{Pickleball}','private','paid',true,'9256653947',NULL,true);
