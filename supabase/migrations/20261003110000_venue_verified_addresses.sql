-- Adds verified street addresses so the Grounds page can link directly to each venue's exact
-- Google Maps location instead of an approximate area pin. Only venues whose address could be
-- confirmed are marked location_verified; the rest show "Location needs verification" in the UI
-- rather than a guessed link. No rows are removed.
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS location_verified boolean NOT NULL DEFAULT false;

UPDATE public.venues SET location_verified=true, address=v.address FROM (VALUES
 ('v1','112, near Gyan Vihar University, Pink City Enclave, Jagatpura, Jaipur, Rajasthan 302017'),
 ('v3','Bhawani Singh Lane, Sahakar Marg, opp. Seva Bharti, Jaipur, Rajasthan 302001'),
 ('v4','A 21-22, 6D Engineering Colony, near Swarn Garden, New Sanganer Rd, Mansarovar, Jaipur, Rajasthan 302020'),
 ('v5','near Hems Water Park, Kamala Nehru Nagar, Keshupura, Jaipur, Rajasthan 302026'),
 ('v7','Shree Ramkaran Nagar, near RK Swimming Pool, Manyawas, Mansarovar, Jaipur, Rajasthan 302020'),
 ('v8','A31, Lotus Villa, near Ashadeep Apartments, Jagatpura, Jaipur, Rajasthan 302017'),
 ('v9','C-79, Shiv Marg, Chabra Rd, Hawa Sadak / Dundlod Colony, Civil Lines, Jaipur, Rajasthan 302019'),
 ('v10','Plot No. 23-24, Shankar Vihar Rd, Ganesh Nagar, Murlipura Scheme, Murlipura, Jaipur, Rajasthan 302039'),
 ('v11','Plot No. 57-58, near Vidyadhar Nagar Stadium Road, Sector-9, Vishwakarma Industrial Area, Vidyadhar Nagar, Jaipur, Rajasthan 302013'),
 ('v12','128, Bhawani Singh Lane, Sahakar Marg, Sudarshanpura, Lalkothi, Jaipur, Rajasthan 302001'),
 ('v13','14 E I C-6, behind Sunny Trade Centre, New Aatish Market, Shanti Nagar, Mansarovar, Jaipur, Rajasthan 302020'),
 ('v14','Plot 8-9, Jawahar Lal Nehru Marg, Shree Vihar, Chandrakala Colony, Durgapura, Jaipur, Rajasthan 302017'),
 ('v15','98, Rathore Nagar, Queens Rd, Vaishali Nagar, Jaipur, Rajasthan 302021')
) AS v(id,address) WHERE venues.id=v.id;
