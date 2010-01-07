<?php

  // Copyright 2009 Scalable Computing Experts, Inc.
  // Author: Tom Clegg

require_once "DB.php";

function &theDb() { global $gDb; return $gDb; }

$gDsn = "mysql://$gDbUser:$gDbPassword@$gDbHost/$gDbDatabase";
$gDb = DB::connect ($gDsn);
if (DB::isError ($gDb)) die (theDb()->getMessage());

theDb()->setFetchMode (DB_FETCHMODE_ASSOC);

?>
